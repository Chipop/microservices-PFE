"""
Tiny dependency-free CORS middleware.

We don't want to add django-cors-headers (which would force a rebuild of the
image) just so the Quasar dev-server can reach these services from the browser.
This middleware adds permissive CORS headers and short-circuits the preflight
OPTIONS request. Tokens travel as `Authorization: Bearer ...`, never cookies,
so a wildcard origin (without credentials) is safe here.
"""

from django.http import HttpResponse


class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)

        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "authorization, content-type, x-internal-key"
        response["Access-Control-Max-Age"] = "86400"
        return response
