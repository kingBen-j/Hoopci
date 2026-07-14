from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from apps.core.permissions import IsJoueur
from . import services
from .models import CarteTransfert, Offre
from .serializers import (
    CarteTransfertSerializer, CarteTransfertUpdateSerializer,
    OffreSerializer, OffreCreateSerializer, OffreReponseSerializer,
)
from .filters import CarteTransfertFilter


class CarteTransfertViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        CarteTransfert.objects
        .select_related('joueur', 'joueur__profil_joueur')
        .filter(disponible=True, joueur__is_active=True)
        .order_by('-mise_en_avant', '-created_at')
    )
    serializer_class = CarteTransfertSerializer
    filterset_class = CarteTransfertFilter
    search_fields = ('joueur__first_name', 'joueur__last_name', 'joueur__commune')

    def list(self, request, *args, **kwargs):
        # Mémorise les critères des recruteurs pour les suggestions automatiques
        services.enregistrer_recherche(request)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def suggestions(self, request):
        """Joueurs suggérés automatiquement au recruteur selon ses habitudes de recherche."""
        if request.user.role not in services.ROLES_RECRUTEURS:
            return Response({'detail': 'Réservé aux recruteurs.'}, status=status.HTTP_403_FORBIDDEN)
        resultats = []
        for score, carte, raisons in services.suggerer_joueurs(request.user):
            data = CarteTransfertSerializer(carte, context={'request': request}).data
            data['score_reco'] = round(score, 1)
            data['raisons'] = raisons
            resultats.append(data)
        return Response(resultats)

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[permissions.IsAuthenticated, IsJoueur], url_path='moi')
    def moi(self, request):
        """Permet à un joueur de consulter ou créer/modifier sa propre carte."""
        if request.method == 'GET':
            carte, _ = CarteTransfert.objects.get_or_create(joueur=request.user)
            return Response(CarteTransfertSerializer(carte, context={'request': request}).data)

        carte, _ = CarteTransfert.objects.get_or_create(joueur=request.user)
        serializer = CarteTransfertUpdateSerializer(carte, data=request.data, partial=(request.method == 'PATCH'))
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CarteTransfertSerializer(carte, context={'request': request}).data)


class OffreViewSet(viewsets.ModelViewSet):
    serializer_class = OffreSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        # Un utilisateur voit seulement ses offres envoyées et reçues
        return Offre.objects.filter(Q(emetteur=user) | Q(joueur=user)).select_related('emetteur', 'joueur')

    def get_serializer_class(self):
        if self.action == 'create':
            return OffreCreateSerializer
        if self.action == 'partial_update':
            return OffreReponseSerializer
        return OffreSerializer

    def partial_update(self, request, *args, **kwargs):
        """Répondre à une offre — réservé au joueur ciblé."""
        offre = self.get_object()
        if offre.joueur != request.user:
            return Response({'detail': "Seul le joueur concerné peut répondre à cette offre."}, status=status.HTTP_403_FORBIDDEN)
        if offre.statut != Offre.STATUT_EN_ATTENTE:
            return Response({'detail': "Cette offre a déjà reçu une réponse."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)
