from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .events import publish_domain_event
from .models import Profile
from .storage import ProfileStorageError, get_profile_storage


def profile_picture_url(profile):
    if not profile.profile_picture_key:
        return None
    try:
        return get_profile_storage().get_read_url(profile.profile_picture_key)
    except ProfileStorageError:
        return None


def validate_profile_picture(file_obj):
    content_type = getattr(file_obj, "content_type", "")
    size = getattr(file_obj, "size", 0)

    if content_type not in settings.PROFILE_PICTURE_ALLOWED_CONTENT_TYPES:
        raise ValidationError({
            "file": f"Unsupported content type. Allowed: {', '.join(settings.PROFILE_PICTURE_ALLOWED_CONTENT_TYPES)}"
        })
    if size > settings.PROFILE_PICTURE_MAX_BYTES:
        raise ValidationError({"file": f"File exceeds {settings.PROFILE_PICTURE_MAX_BYTES} bytes."})


@transaction.atomic
def upload_profile_picture(profile, file_obj):
    validate_profile_picture(file_obj)
    storage = get_profile_storage()
    old_key = profile.profile_picture_key
    key = storage.build_key(profile.auth_user_id, getattr(file_obj, "name", "profile-picture"))

    try:
        storage.upload(key, file_obj, file_obj.content_type)
    except Exception as exc:
        raise ValidationError({"file": "Profile picture upload failed."}) from exc

    profile.profile_picture_key = key
    profile.profile_picture_content_type = file_obj.content_type
    profile.profile_picture_size = file_obj.size
    profile.save(update_fields=[
        "profile_picture_key",
        "profile_picture_content_type",
        "profile_picture_size",
        "updated_at",
    ])

    if old_key and old_key != key:
        storage.delete(old_key)

    return profile


@transaction.atomic
def delete_profile_picture(profile):
    storage = get_profile_storage()
    old_key = profile.profile_picture_key
    profile.profile_picture_key = ""
    profile.profile_picture_content_type = ""
    profile.profile_picture_size = None
    profile.save(update_fields=[
        "profile_picture_key",
        "profile_picture_content_type",
        "profile_picture_size",
        "updated_at",
    ])
    if old_key:
        storage.delete(old_key)
    return profile


@transaction.atomic
def provision_profile_from_user_registered(event):
    data = event.get("data") or {}
    resource = event.get("resource") or {}
    raw_user_id = data.get("userId") or data.get("authUserId") or resource.get("id")
    username = data.get("username")
    email = data.get("email", "")

    if raw_user_id is None:
        raise ValueError("user.registered event is missing resource.id")
    if not username:
        raise ValueError("user.registered event is missing data.username")

    profile, created = Profile.objects.get_or_create(
        auth_user_id=int(raw_user_id),
        defaults={
            "username": str(username),
            "email": str(email or ""),
        },
    )
    if created:
        publish_domain_event(
            "user.profile.created",
            "user",
            profile.auth_user_id,
            actor_user_id=profile.auth_user_id,
            data=_profile_search_document(profile),
        )
        return profile

    changed_fields = []
    if profile.username != str(username):
        profile.username = str(username)
        changed_fields.append("username")
    if email is not None and profile.email != str(email):
        profile.email = str(email)
        changed_fields.append("email")
    if changed_fields:
        changed_fields.append("updated_at")
        profile.save(update_fields=changed_fields)
    return profile


def _profile_search_document(profile):
    return {
        "type": "user",
        "resourceId": profile.auth_user_id,
        "authUserId": profile.auth_user_id,
        "username": profile.username,
        "title": profile.username,
        "biography": profile.biography,
        "description": profile.biography,
        "timezone": profile.timezone,
        "language": profile.language,
        "profilePictureUrl": profile_picture_url(profile),
        "updatedAt": profile.updated_at,
    }
