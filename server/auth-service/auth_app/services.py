import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuthSession, AuthToken, LoginAttempt, User


LOCK_THRESHOLD = int(os.environ.get("AUTH_LOCK_THRESHOLD", "5"))
LOCK_MINUTES = int(os.environ.get("AUTH_LOCK_MINUTES", "15"))
RESET_TOKEN_MINUTES = int(os.environ.get("AUTH_RESET_TOKEN_MINUTES", "30"))
VERIFY_TOKEN_HOURS = int(os.environ.get("AUTH_VERIFY_TOKEN_HOURS", "24"))


def client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def user_agent(request):
    return request.META.get("HTTP_USER_AGENT", "")


def _record_attempt(username, request, successful, user=None, failure_reason=""):
    LoginAttempt.objects.create(
        username=username or "",
        user=user,
        ip_address=client_ip(request),
        user_agent=user_agent(request),
        successful=successful,
        failure_reason=failure_reason,
    )


def _blacklist_jti(jti):
    try:
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    except Exception:
        return

    token = OutstandingToken.objects.filter(jti=jti).first()
    if token:
        BlacklistedToken.objects.get_or_create(token=token)


def _blacklist_refresh(refresh_token):
    try:
        RefreshToken(refresh_token).blacklist()
    except Exception:
        pass


def _send_token_email(subject, message, recipient):
    if recipient:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
            recipient_list=[recipient],
            fail_silently=True,
        )


def issue_auth_tokens(user, request):
    refresh = RefreshToken.for_user(user)
    expires_at = timezone.datetime.fromtimestamp(int(refresh["exp"]), tz=timezone.get_current_timezone())
    session = AuthSession.objects.create(
        user=user,
        refresh_jti=str(refresh["jti"]),
        ip_address=client_ip(request),
        user_agent=user_agent(request),
        expires_at=expires_at,
    )
    refresh["session_id"] = session.id
    access = refresh.access_token
    return {
        "access": str(access),
        "refresh": str(refresh),
        "session_id": session.id,
    }


def login_user(username, password, request, two_factor_code=None):
    user = User.objects.filter(username=username).first()
    if user and user.is_locked:
        _record_attempt(username, request, False, user=user, failure_reason="locked")
        raise PermissionDenied({
            "detail": "Account is temporarily locked.",
            "locked_until": user.locked_until.isoformat(),
        })

    user = authenticate(request=request, username=username, password=password)
    if not user:
        existing_user = User.objects.filter(username=username).first()
        if existing_user:
            existing_user.failed_login_count += 1
            update_fields = ["failed_login_count"]
            if existing_user.failed_login_count >= LOCK_THRESHOLD:
                existing_user.locked_until = timezone.now() + timedelta(minutes=LOCK_MINUTES)
                update_fields.append("locked_until")
            existing_user.save(update_fields=update_fields)
        _record_attempt(username, request, False, user=existing_user, failure_reason="invalid_credentials")
        raise AuthenticationFailed("No active account found with the given credentials")

    if user.two_factor_enabled:
        if not two_factor_code:
            _record_attempt(username, request, False, user=user, failure_reason="two_factor_required")
            return {"two_factor_required": True}
        if not verify_totp(user.two_factor_secret, two_factor_code):
            _record_attempt(username, request, False, user=user, failure_reason="invalid_two_factor_code")
            raise AuthenticationFailed("Invalid two-factor code")

    if getattr(settings, "AUTH_REQUIRE_EMAIL_VERIFICATION", False) and not user.email_verified_at:
        _record_attempt(username, request, False, user=user, failure_reason="email_not_verified")
        raise PermissionDenied("Email verification is required.")

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login = timezone.now()
    user.save(update_fields=["failed_login_count", "locked_until", "last_login"])
    _record_attempt(username, request, True, user=user)
    return issue_auth_tokens(user, request)


def logout(refresh_token, user=None):
    token = RefreshToken(refresh_token)
    jti = str(token["jti"])
    _blacklist_refresh(refresh_token)
    session = AuthSession.objects.filter(refresh_jti=jti).first()
    if session and (user is None or session.user_id == user.id):
        session.revoke()


def logout_all(user):
    sessions = AuthSession.objects.filter(user=user, revoked_at__isnull=True)
    for session in sessions:
        _blacklist_jti(session.refresh_jti)
    sessions.update(revoked_at=timezone.now())


def revoke_session(session):
    _blacklist_jti(session.refresh_jti)
    session.revoke()


@transaction.atomic
def change_password(user, old_password, new_password):
    if not user.check_password(old_password):
        raise ValidationError({"old_password": "Old password is incorrect."})
    validate_password(new_password, user=user)
    user.set_password(new_password)
    user.save(update_fields=["password"])
    logout_all(user)


def request_password_reset(email):
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return None
    token, raw_token = AuthToken.issue(
        user=user,
        purpose=AuthToken.Purpose.PASSWORD_RESET,
        lifetime=timedelta(minutes=RESET_TOKEN_MINUTES),
    )
    _send_token_email(
        "Password reset",
        f"Use this token to reset your password: {raw_token}",
        user.email,
    )
    return raw_token if settings.DEBUG else None


@transaction.atomic
def reset_password(raw_token, new_password):
    token = _get_usable_token(raw_token, AuthToken.Purpose.PASSWORD_RESET)
    user = token.user
    validate_password(new_password, user=user)
    user.set_password(new_password)
    user.failed_login_count = 0
    user.locked_until = None
    user.save(update_fields=["password", "failed_login_count", "locked_until"])
    token.mark_used()
    logout_all(user)


def request_verification(user, purpose=AuthToken.Purpose.EMAIL_VERIFICATION):
    token, raw_token = AuthToken.issue(
        user=user,
        purpose=purpose,
        lifetime=timedelta(hours=VERIFY_TOKEN_HOURS),
    )
    _send_token_email(
        "Verify your account",
        f"Use this token to verify your account: {raw_token}",
        user.email,
    )
    return raw_token if settings.DEBUG else None


@transaction.atomic
def confirm_verification(raw_token, purpose=AuthToken.Purpose.EMAIL_VERIFICATION):
    token = _get_usable_token(raw_token, purpose)
    user = token.user
    if purpose == AuthToken.Purpose.EMAIL_VERIFICATION:
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified_at"])
    if purpose == AuthToken.Purpose.ACCOUNT_ACTIVATION:
        user.is_active = True
        user.save(update_fields=["is_active"])
    token.mark_used()
    return user


def _get_usable_token(raw_token, purpose):
    token_hash = AuthToken.hash_token(raw_token)
    token = AuthToken.objects.filter(token_hash=token_hash, purpose=purpose).select_related("user").first()
    if not token or not token.is_usable:
        raise ValidationError({"token": "Token is invalid or expired."})
    return token


def generate_totp_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _totp(secret, for_time=None, interval=30, digits=6):
    if for_time is None:
        for_time = int(time.time())
    padded_secret = secret + "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(padded_secret, casefold=True)
    counter = int(for_time // interval)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % (10 ** digits)).zfill(digits)


def verify_totp(secret, code, window=1):
    if not secret or not code:
        return False
    clean_code = str(code).strip()
    now = int(time.time())
    for drift in range(-window, window + 1):
        if hmac.compare_digest(_totp(secret, now + drift * 30), clean_code):
            return True
    return False


def totp_uri(user, secret):
    issuer = quote("FlowForge")
    label = quote(f"FlowForge:{user.username}")
    return f"otpauth://totp/{label}?secret={secret}&issuer={issuer}&digits=6&period=30"
