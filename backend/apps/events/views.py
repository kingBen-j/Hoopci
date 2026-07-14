from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.core.permissions import IsPromoteur, IsOrganisateurOwner
from .models import Evenement, InteretEvenement
from .serializers import (
    EvenementListSerializer, EvenementDetailSerializer, EvenementCreateSerializer,
)
from .filters import EvenementFilter


class EvenementViewSet(viewsets.ModelViewSet):
    queryset = Evenement.objects.select_related('organisateur').prefetch_related('interesses').order_by('-date_debut')
    filterset_class = EvenementFilter
    search_fields = ('titre', 'commune', 'lieu')
    ordering_fields = ('date_debut', 'created_at', 'prix_entree')

    def get_parsers(self):
        if self.request.method in ('POST', 'PUT', 'PATCH'):
            return [MultiPartParser(), FormParser(), JSONParser()]
        return super().get_parsers()

    def get_serializer_class(self):
        if self.action == 'list':
            return EvenementListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return EvenementCreateSerializer
        return EvenementDetailSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsPromoteur()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsOrganisateurOwner()]
        if self.action == 'interesse':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    @action(detail=True, methods=['post'])
    def interesse(self, request, pk=None):
        evenement = self.get_object()
        interet, created = InteretEvenement.objects.get_or_create(utilisateur=request.user, evenement=evenement)
        if not created:
            interet.delete()
        # Requête directe : le prefetch de get_object() serait périmé après le toggle
        nb = InteretEvenement.objects.filter(evenement=evenement).count()
        return Response(
            {'interesse': created, 'nb_interesses': nb},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], url_path='mes-evenements',
            permission_classes=[permissions.IsAuthenticated, IsPromoteur])
    def mes_evenements(self, request):
        qs = self.get_queryset().filter(organisateur=request.user)
        serializer = EvenementListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
