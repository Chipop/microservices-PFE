from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from .views import (
    AccountActivationConfirmView,
    AccountActivationRequestView,
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    ForgotPasswordView,
    LoginView,
    LogoutAllView,
    LogoutView,
    PasswordChangeView,
    PasswordResetConfirmView,
    RefreshView,
    RegisterView,
    SessionDetailView,
    SessionListView,
    TwoFactorConfirmView,
    TwoFactorDisableView,
    TwoFactorSetupView,
)


urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("refresh/", RefreshView.as_view()),
    path("verify/", TokenVerifyView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("logout-all/", LogoutAllView.as_view()),
    path("password/change/", PasswordChangeView.as_view()),
    path("password/forgot/", ForgotPasswordView.as_view()),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view()),
    path("email/verify/request/", EmailVerificationRequestView.as_view()),
    path("email/verify/confirm/", EmailVerificationConfirmView.as_view()),
    path("activation/request/", AccountActivationRequestView.as_view()),
    path("activation/confirm/", AccountActivationConfirmView.as_view()),
    path("2fa/setup/", TwoFactorSetupView.as_view()),
    path("2fa/confirm/", TwoFactorConfirmView.as_view()),
    path("2fa/disable/", TwoFactorDisableView.as_view()),
    path("sessions/", SessionListView.as_view()),
    path("sessions/<int:pk>/", SessionDetailView.as_view()),
]
