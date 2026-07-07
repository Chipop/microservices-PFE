from django.db import models

# Create your models here.

class Profile(models.Model):
    auth_user_id = models.IntegerField(unique=True)   # id from Auth's DB
    username = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username
