from django.test import TestCase
from unittest.mock import patch
from rest_framework.test import APIRequestFactory, force_authenticate

from .models import Profile
from .services import provision_profile_from_user_registered
from .views import ProfileViewSet


class UserRegisteredProvisioningTests(TestCase):
    def event(self, user_id=12, username="alice", email="alice@example.com"):
        return {
            "eventId": "event-1",
            "eventType": "user.registered",
            "resource": {"type": "user", "id": user_id},
            "data": {
                "username": username,
                "email": email,
            },
        }

    @patch("profiles.services.publish_domain_event")
    def test_creates_profile_from_user_registered_event(self, publish_domain_event):
        profile = provision_profile_from_user_registered(self.event())

        self.assertEqual(profile.auth_user_id, 12)
        self.assertEqual(profile.username, "alice")
        self.assertEqual(profile.email, "alice@example.com")
        self.assertEqual(Profile.objects.count(), 1)
        publish_domain_event.assert_called_once()

    @patch("profiles.services.publish_domain_event")
    def test_is_idempotent_for_duplicate_event(self, publish_domain_event):
        provision_profile_from_user_registered(self.event())
        provision_profile_from_user_registered(self.event())

        self.assertEqual(Profile.objects.count(), 1)
        publish_domain_event.assert_called_once()


class ProfileResolveTests(TestCase):
    def test_resolves_profiles_by_auth_user_id(self):
        Profile.objects.create(auth_user_id=12, username="alice", email="alice@example.com")
        Profile.objects.create(auth_user_id=20, username="bob", email="bob@example.com")
        request = APIRequestFactory().get("/profiles/resolve/", {"auth_user_ids": "20,12"})
        force_authenticate(request, token={"user_id": 12})

        response = ProfileViewSet.as_view({"get": "resolve"})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {item["auth_user_id"]: item["username"] for item in response.data},
            {12: "alice", 20: "bob"},
        )

    def test_rejects_invalid_auth_user_ids(self):
        request = APIRequestFactory().get("/profiles/resolve/", {"auth_user_ids": "abc"})
        force_authenticate(request, token={"user_id": 12})

        response = ProfileViewSet.as_view({"get": "resolve"})(request)

        self.assertEqual(response.status_code, 400)


class ProfileSearchTests(TestCase):
    def test_searches_profiles_by_email(self):
        Profile.objects.create(auth_user_id=12, username="alice", email="alice@example.com")
        Profile.objects.create(auth_user_id=20, username="bob", email="bob@company.test")
        request = APIRequestFactory().get("/profiles/search/", {"q": "company"})
        force_authenticate(request, token={"user_id": 12})

        response = ProfileViewSet.as_view({"get": "search"})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["email"] for item in response.data], ["bob@company.test"])

    def test_searches_profiles_by_username(self):
        Profile.objects.create(auth_user_id=12, username="alice", email="alice@example.com")
        Profile.objects.create(auth_user_id=20, username="workspace-admin", email="admin@example.com")
        request = APIRequestFactory().get("/profiles/search/", {"q": "workspace"})
        force_authenticate(request, token={"user_id": 12})

        response = ProfileViewSet.as_view({"get": "search"})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["username"] for item in response.data], ["workspace-admin"])
