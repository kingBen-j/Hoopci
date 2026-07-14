from django.urls import path
from .views import (
    InitierPaiementTournoiView, InitierPaiementEquipeView,
    InitierPromotionCompteView, InitierPromotionEquipeView,
    PortefeuilleView, StatutPaiementView, SimulerPaiementView, WebhookGeniusView,
)

urlpatterns = [
    path('tournois/<int:tournoi_id>/initier/', InitierPaiementTournoiView.as_view(), name='paiement-initier-tournoi'),
    path('equipes/<int:equipe_id>/initier/', InitierPaiementEquipeView.as_view(), name='paiement-initier-equipe'),
    path('equipes/<int:equipe_id>/promouvoir/', InitierPromotionEquipeView.as_view(), name='paiement-promouvoir-equipe'),
    path('carte/initier/', InitierPromotionCompteView.as_view(), name='paiement-promotion-compte'),
    path('portefeuille/', PortefeuilleView.as_view(), name='paiement-portefeuille'),
    path('webhook/genius/', WebhookGeniusView.as_view(), name='paiement-webhook-genius'),
    path('<str:reference>/simuler/', SimulerPaiementView.as_view(), name='paiement-simuler'),
    path('<str:reference>/', StatutPaiementView.as_view(), name='paiement-statut'),
]
