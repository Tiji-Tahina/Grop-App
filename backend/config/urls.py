from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import path, include


def health(_request):
    try:
        connection.ensure_connection()
        db_status = "ok"
    except Exception as exc:  # noqa: BLE001
        db_status = f"error: {exc.__class__.__name__}"
    return JsonResponse({"status": "ok", "db": db_status})


urlpatterns = [
    path('api/health/', health),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/crops/', include('crops.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/predictions/', include('predictions.urls')),
]
