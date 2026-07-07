from rest_framework import serializers
from .models import Profile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["id", "auth_user_id", "username", "email", "created_at"]
        read_only_fields = ["id", "created_at"]