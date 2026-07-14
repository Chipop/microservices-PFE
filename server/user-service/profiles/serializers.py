from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from .models import Profile
from .services import profile_picture_url


class InternalProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["id", "auth_user_id", "username", "email", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "auth_user_id",
            "username",
            "email",
            "profile_picture_url",
            "biography",
            "timezone",
            "language",
            "preferences",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "auth_user_id",
            "email",
            "profile_picture_url",
            "created_at",
            "updated_at",
        ]

    def get_profile_picture_url(self, obj):
        return profile_picture_url(obj)


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["username", "biography", "timezone", "language", "preferences"]

    def validate_timezone(self, value):
        if not value:
            return value
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise serializers.ValidationError("Unknown timezone.") from exc
        return value

    def validate_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Preferences must be a JSON object.")
        return value


class PublicProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    joined_date = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Profile
        fields = ["username", "biography", "timezone", "language", "profile_picture_url", "joined_date"]
        read_only_fields = fields

    def get_profile_picture_url(self, obj):
        return profile_picture_url(obj)


class ProfileResolveSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ["auth_user_id", "username", "email", "profile_picture_url"]
        read_only_fields = fields

    def get_profile_picture_url(self, obj):
        return profile_picture_url(obj)


class ProfilePictureUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
