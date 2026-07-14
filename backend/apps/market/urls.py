from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CarteTransfertViewSet, OffreViewSet

router = DefaultRouter()
router.register(r'cartes', CarteTransfertViewSet, basename='carte')
router.register(r'offres', OffreViewSet, basename='offre')

urlpatterns = [
    path('', include(router.urls)),
]
