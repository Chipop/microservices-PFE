from rest_framework import viewsets
from .models import Todo
from .serializers import TodoSerializer
from rest_framework.permissions import IsAuthenticated


class TodoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TodoSerializer

    def get_queryset(self):
        return Todo.objects.filter(user_id=int(self.request.auth["user_id"]))

    def perform_create(self, serializer):
        serializer.save(user_id=int(self.request.auth["user_id"]))