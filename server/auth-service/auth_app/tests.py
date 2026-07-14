from django.test import TestCase

from .models import User
from .serializers import RegisterSerializer


class RegisterSerializerTests(TestCase):
    def test_rejects_duplicate_username_case_insensitive(self):
        User.objects.create_user(username="Alice", email="alice@example.com", password="password123")

        serializer = RegisterSerializer(data={
            "username": "alice",
            "email": "alice2@example.com",
            "password": "password123",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("username", serializer.errors)

    def test_rejects_duplicate_email_case_insensitive(self):
        User.objects.create_user(username="alice", email="Alice@Example.com", password="password123")

        serializer = RegisterSerializer(data={
            "username": "bob",
            "email": "alice@example.com",
            "password": "password123",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_normalizes_email_on_create(self):
        serializer = RegisterSerializer(data={
            "username": " alice ",
            "email": "Alice@Example.com",
            "password": "password123",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.username, "alice")
        self.assertEqual(user.email, "alice@example.com")
