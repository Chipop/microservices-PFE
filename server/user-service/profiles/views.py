from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTTokenUserAuthentication

from .models import Profile
from .permissions import HasValidToken, IsInternalService
from .serializers import (
    InternalProfileCreateSerializer,
    ProfilePictureUploadSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    PublicProfileSerializer,
)
from .services import delete_profile_picture, upload_profile_picture


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer

    def get_authenticators(self):
        if getattr(self, "action", None) in {"create", "public"}:
            return []
        return [JWTTokenUserAuthentication()]

    def get_permissions(self):
        if self.action == "create":
            return [IsInternalService()]
        if self.action == "public":
            return [AllowAny()]
        return [HasValidToken()]

    def get_serializer_class(self):
        if self.action == "create":
            return InternalProfileCreateSerializer
        if self.action in {"update", "partial_update"}:
            return ProfileUpdateSerializer
        if self.action == "public":
            return PublicProfileSerializer
        if self.action == "picture":
            return ProfilePictureUploadSerializer
        return ProfileSerializer

    def get_queryset(self):
        user_id = self.request.auth["user_id"]
        return Profile.objects.filter(auth_user_id=int(user_id))

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(instance).data)

    @action(detail=False, methods=["get"], url_path=r"public/(?P<username>[^/.]+)")
    def public(self, request, username=None):
        profile = generics.get_object_or_404(Profile, username=username)
        return Response(self.get_serializer(profile).data)

    @action(
        detail=False,
        methods=["post", "put", "delete"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="picture",
    )
    def picture(self, request):
        profile = generics.get_object_or_404(self.get_queryset())

        if request.method == "DELETE":
            delete_profile_picture(profile)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = upload_profile_picture(profile, serializer.validated_data["file"])
        return Response(ProfileSerializer(profile).data)
