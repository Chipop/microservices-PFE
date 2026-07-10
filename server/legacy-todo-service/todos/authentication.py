from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class StatelessJWTAuthentication(JWTAuthentication):
    """Verify the token but don't look up a user in the local DB.
    This service has no users table — identity comes from token claims."""

    def get_user(self, validated_token):
        # skip the DB lookup; return a lightweight object carrying the id
        return TokenUser(validated_token)


class TokenUser:
    """Minimal user stand-in built from token claims. Enough for
    IsAuthenticated to pass and for views to read .id."""
    is_authenticated = True

    def __init__(self, validated_token):
        self.id = validated_token.get("user_id")
        self.pk = self.id
        self.token = validated_token