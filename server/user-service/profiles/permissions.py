# profiles — a permission that checks for the internal key
from rest_framework.permissions import BasePermission
import os

class IsInternalService(BasePermission):
    def has_permission(self, request, view):
        return request.headers.get("X-Internal-Key") == os.environ.get("INTERNAL_API_KEY")
    

class HasValidToken(BasePermission):
    def has_permission(self, request, view):
        return request.auth is not None


