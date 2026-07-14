from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TournoiViewSet

router = DefaultRouter()
router.register(r'', TournoiViewSet, basename='tournoi')

urlpatterns = [
    path('', include(router.urls)),
]
