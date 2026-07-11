from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError

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
