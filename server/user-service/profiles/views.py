from django.db.models import Q
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTTokenUserAuthentication

from .models import Profile
from .events import publish_domain_event
from .permissions import HasValidToken, IsInternalService
from .serializers import (
    InternalProfileCreateSerializer,
    ProfilePictureUploadSerializer,
    ProfileResolveSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    PublicProfileSerializer,
)
from .services import delete_profile_picture, profile_picture_url, upload_profile_picture


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer

    def get_authenticators(self):
        if getattr(self, "action", None) in {"create", "public", "search_snapshots"}:
            return []
        return [JWTTokenUserAuthentication()]

    def get_permissions(self):
        if self.action == "create":
            return [IsInternalService()]
        if self.action == "search_snapshots":
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
        if self.action == "resolve":
            return ProfileResolveSerializer
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
        publish_domain_event(
            "user.profile.updated",
            "user",
            instance.auth_user_id,
            actor_user_id=instance.auth_user_id,
            data=search_document(instance),
        )
        return Response(ProfileSerializer(instance).data)

    def perform_create(self, serializer):
        profile = serializer.save()
        publish_domain_event(
            "user.profile.created",
            "user",
            profile.auth_user_id,
            actor_user_id=profile.auth_user_id,
            data=search_document(profile),
        )

    @action(detail=False, methods=["get"], url_path=r"public/(?P<username>[^/.]+)")
    def public(self, request, username=None):
        profile = generics.get_object_or_404(Profile, username=username)
        return Response(self.get_serializer(profile).data)

    @action(detail=False, methods=["get"], url_path="resolve")
    def resolve(self, request):
        raw_ids = request.query_params.get("auth_user_ids", "")
        ids = []
        for raw_id in raw_ids.split(","):
            raw_id = raw_id.strip()
            if not raw_id:
                continue
            try:
                ids.append(int(raw_id))
            except ValueError:
                return Response(
                    {"auth_user_ids": "Expected a comma-separated list of integer auth user ids."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if not ids:
            return Response([])
        profiles = Profile.objects.filter(auth_user_id__in=ids)
        return Response(self.get_serializer(profiles, many=True).data)

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        profiles = Profile.objects.order_by("email", "username")
        if query:
            profiles = profiles.filter(Q(email__icontains=query) | Q(username__icontains=query))
        return Response(ProfileResolveSerializer(profiles[:10], many=True).data)

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
            publish_domain_event(
                "user.profile.updated",
                "user",
                profile.auth_user_id,
                actor_user_id=profile.auth_user_id,
                data=search_document(profile),
            )
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = upload_profile_picture(profile, serializer.validated_data["file"])
        publish_domain_event(
            "user.profile.updated",
            "user",
            profile.auth_user_id,
            actor_user_id=profile.auth_user_id,
            data=search_document(profile),
        )
        return Response(ProfileSerializer(profile).data)

    @action(detail=False, methods=["get"], url_path="internal/search-snapshots")
    def search_snapshots(self, request):
        page = max(int(request.query_params.get("page", "0")), 0)
        size = min(max(int(request.query_params.get("size", "200")), 1), 200)
        offset = page * size
        queryset = Profile.objects.order_by("id")
        rows = list(queryset[offset:offset + size])
        return Response({
            "items": [search_document(profile) for profile in rows],
            "hasNext": len(rows) == size,
        })


def search_document(profile):
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
