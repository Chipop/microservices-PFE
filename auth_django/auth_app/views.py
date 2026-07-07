import os
import requests
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import User
from .serializers import RegisterSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        # Réception: hand the new user to the Profiles service THROUGH the
        # API gateway, rather than calling users-django directly.
        gateway = os.environ.get("GATEWAY_URL", "http://gateway")
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