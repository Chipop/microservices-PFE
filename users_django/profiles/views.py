# profiles/views.py
from rest_framework import viewsets
from rest_framework_simplejwt.authentication import JWTTokenUserAuthentication
from .models import Profile
from .serializers import ProfileSerializer
from .permissions import HasValidToken, IsInternalService


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer

    def get_authenticators(self):
        # POST (create) is the internal réception call — no JWT, uses X-Internal-Key.
        # Everything else is user-facing and runs JWT auth.
        if self.request and self.request.method == "POST":
            return []
        return [JWTTokenUserAuthentication()]

    def get_permissions(self):
        if self.action == "create":
            return [IsInternalService()]      # internal key
        return [HasValidToken()]              # user JWT

    def get_queryset(self):
        user_id = self.request.auth["user_id"]
        return Profile.objects.filter(auth_user_id=int(user_id))