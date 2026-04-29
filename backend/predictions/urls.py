from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import predict, PredictionViewSet, olap_query

router = DefaultRouter()
router.register(r'history', PredictionViewSet, basename='prediction')

urlpatterns = [
    path('predict/', predict, name='predict'),
    path('analytics/', olap_query, name='olap_query'),
    path('', include(router.urls)),
]
