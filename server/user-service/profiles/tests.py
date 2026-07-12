from django.test import TestCase
from unittest.mock import patch

from .models import Profile
from .services import provision_profile_from_user_registered


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
