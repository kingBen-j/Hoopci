from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .admin_api import (
    StatsAdminView, PaiementAdminViewSet, UtilisateurAdminViewSet,
    TournoiAdminViewSet, EvenementAdminViewSet, CarteAdminViewSet,
    EquipeAdminViewSet, OffreAdminViewSet, ProfilJoueurAdminViewSet,
)

router = DefaultRouter()
router.register(r'paiements', PaiementAdminViewSet, basename='admin-paiement')
router.register(r'utilisateurs', UtilisateurAdminViewSet, basename='admin-utilisateur')
router.register(r'tournois', TournoiAdminViewSet, basename='admin-tournoi')
router.register(r'evenements', EvenementAdminViewSet, basename='admin-evenement')
router.register(r'cartes', CarteAdminViewSet, basename='admin-carte')
router.register(r'equipes', EquipeAdminViewSet, basename='admin-equipe')
router.register(r'offres', OffreAdminViewSet, basename='admin-offre')
router.register(r'joueurs', ProfilJoueurAdminViewSet, basename='admin-joueur')

urlpatterns = [
    path('stats/', StatsAdminView.as_view(), name='admin-stats'),
    path('', include(router.urls)),
]
