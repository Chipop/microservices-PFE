import os

import requests
from django.conf import settings
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from .models import AuthSession, AuthToken, User
from .serializers import (
    ForgotPasswordSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    RefreshTokenSerializer,
    RegisterSerializer,
    SessionSerializer,
    TokenConfirmSerializer,
    TwoFactorCodeSerializer,
)
from .services import (
    change_password,
    confirm_verification,
    generate_totp_secret,
    login_user,
    logout,
    logout_all,
    request_password_reset,
    request_verification,
    reset_password,
    revoke_session,
    totp_uri,
    verify_totp,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        request_verification(user, AuthToken.Purpose.EMAIL_VERIFICATION)
        gateway = os.environ.get("GATEWAY_URL", "http://api-gateway")
        try:
            requests.post(
                f"{gateway}/api/profiles/",
                json={
                    "auth_user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                headers={"X-Internal-Key": os.environ.get("INTERNAL_API_KEY")},
                timeout=3,
            )
        except requests.RequestException:
            pass


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = login_user(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
            request=request,
            two_factor_code=serializer.validated_data.get("two_factor_code"),
        )
        if result.get("two_factor_required"):
            return Response(
                {"detail": "two_factor_required", "two_factor_required": True},
                status=status.HTTP_202_ACCEPTED,
            )
        return Response({"access": result["access"], "refresh": result["refresh"]})


class RefreshView(TokenRefreshView):
    pass


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        logout(serializer.validated_data["refresh"], user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout_all(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        change_password(
            request.user,
            serializer.validated_data["old_password"],
            serializer.validated_data["new_password"],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        debug_token = request_password_reset(serializer.validated_data["email"])
        payload = {"detail": "If the email exists, a reset token has been sent."}
        if settings.DEBUG and debug_token:
            payload["token"] = debug_token
        return Response(payload)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_password(serializer.validated_data["token"], serializer.validated_data["new_password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailVerificationRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        debug_token = request_verification(request.user, AuthToken.Purpose.EMAIL_VERIFICATION)
        payload = {"detail": "Verification token sent."}
        if settings.DEBUG and debug_token:
            payload["token"] = debug_token
        return Response(payload)


class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        confirm_verification(serializer.validated_data["token"], AuthToken.Purpose.EMAIL_VERIFICATION)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccountActivationRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        debug_token = request_verification(request.user, AuthToken.Purpose.ACCOUNT_ACTIVATION)
        payload = {"detail": "Activation token sent."}
        if settings.DEBUG and debug_token:
            payload["token"] = debug_token
        return Response(payload)


class AccountActivationConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        confirm_verification(serializer.validated_data["token"], AuthToken.Purpose.ACCOUNT_ACTIVATION)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TwoFactorSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        secret = request.user.two_factor_secret or generate_totp_secret()
        request.user.two_factor_secret = secret
        request.user.save(update_fields=["two_factor_secret"])
        return Response({"secret": secret, "otpauth_url": totp_uri(request.user, secret)})


class TwoFactorConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwoFactorCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not verify_totp(request.user.two_factor_secret, serializer.validated_data["code"]):
            return Response({"code": ["Invalid two-factor code."]}, status=status.HTTP_400_BAD_REQUEST)
        request.user.two_factor_enabled = True
        request.user.save(update_fields=["two_factor_enabled"])
        return Response({"two_factor_enabled": True})


class TwoFactorDisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwoFactorCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if request.user.two_factor_enabled and not verify_totp(
            request.user.two_factor_secret,
            serializer.validated_data["code"],
        ):
            return Response({"code": ["Invalid two-factor code."]}, status=status.HTTP_400_BAD_REQUEST)
        request.user.two_factor_enabled = False
        request.user.two_factor_secret = ""
        request.user.save(update_fields=["two_factor_enabled", "two_factor_secret"])
        return Response({"two_factor_enabled": False})


class SessionListView(generics.ListAPIView):
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AuthSession.objects.filter(user=self.request.user)


class SessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        session = generics.get_object_or_404(AuthSession, pk=pk, user=request.user)
        revoke_session(session)
        return Response(status=status.HTTP_204_NO_CONTENT)
