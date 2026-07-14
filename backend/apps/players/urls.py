from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProfilJoueurViewSet

router = DefaultRouter()
router.register(r'', ProfilJoueurViewSet, basename='joueur')

urlpatterns = [
    path('', include(router.urls)),
]
