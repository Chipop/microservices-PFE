from django.contrib import admin

from .models import AuthSession, AuthToken, LoginAttempt, User


admin.site.register(User)
admin.site.register(AuthSession)
admin.site.register(AuthToken)
admin.site.register(LoginAttempt)
