from django.db import models


class Profile(models.Model):
    auth_user_id = models.IntegerField(unique=True)   # id from Auth's DB
    username = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    profile_picture_key = models.CharField(max_length=512, blank=True)
    profile_picture_content_type = models.CharField(max_length=100, blank=True)
    profile_picture_size = models.PositiveIntegerField(null=True, blank=True)
    biography = models.TextField(blank=True)
    timezone = models.CharField(max_length=64, blank=True)
    language = models.CharField(max_length=16, blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username
