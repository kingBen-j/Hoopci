from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsJoueur
from .models import ProfilJoueur
from .serializers import ProfilJoueurPublicSerializer, ProfilJoueurUpdateSerializer
from .filters import ProfilJoueurFilter


class ProfilJoueurViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        ProfilJoueur.objects
        .select_related('utilisateur')
        .filter(utilisateur__is_active=True)
        .order_by('-tournois_joues')
    )
    serializer_class = ProfilJoueurPublicSerializer
    # Le serializer expose id = utilisateur.id : le détail doit router sur le même identifiant
    lookup_field = 'utilisateur_id'
    filterset_class = ProfilJoueurFilter
    search_fields = ('utilisateur__first_name', 'utilisateur__last_name', 'utilisateur__commune')
    ordering_fields = ('tournois_joues', 'tournois_gagnes', 'mvp_count', 'points')

    def list(self, request, *args, **kwargs):
        # Mémorise les critères des recruteurs pour les suggestions automatiques
        from apps.market.services import enregistrer_recherche
        enregistrer_recherche(request)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated, IsJoueur])
    def moi(self, request):
        profil = request.user.profil_joueur
        if request.method == 'PATCH':
            serializer = ProfilJoueurUpdateSerializer(profil, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(ProfilJoueurPublicSerializer(profil, context={'request': request}).data)
