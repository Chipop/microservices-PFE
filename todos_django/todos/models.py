from django.db import models

class Todo(models.Model):
    user_id = models.IntegerField()        # the id pulled from the JWT
    title = models.CharField(max_length=200)
    done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)