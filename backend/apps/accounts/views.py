from django.db.models import Count, F, IntegerField, Q
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Utilisateur
from .serializers import (
    RegisterSerializer, UtilisateurSerializer, UpdateMeSerializer,
    PromoteurClassementSerializer,
)


class HoopCITokenSerializer(TokenObtainPairSerializer):
    """Ajoute le rôle dans le payload JWT pour éviter un appel /me/ au démarrage."""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        return token


class LoginView(TokenObtainPairView):
    serializer_class = HoopCITokenSerializer


class RegisterView(generics.CreateAPIView):
    queryset = Utilisateur.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UtilisateurSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UpdateMeSerializer
        return UtilisateurSerializer

    def get_object(self):
        return self.request.user

    def get_parsers(self):
        # multipart pour l'upload de photo
        if self.request.method in ('PUT', 'PATCH'):
            from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
            return [MultiPartParser(), FormParser(), JSONParser()]
        return super().get_parsers()


class PromoteurClassementView(generics.ListAPIView):
    """
    GET /api/promoteurs/ — classement des meilleurs promoteurs.
    Score = tournois terminés ×25 + tournois publiés ×10 + événements ×15
            + équipes attirées ×5 + intéressés aux événements ×2
    """
    serializer_class = PromoteurClassementSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = []

    def get_queryset(self):
        return (
            Utilisateur.objects
            .filter(role=Utilisateur.ROLE_PROMOTEUR, is_active=True)
            .annotate(
                nb_tournois=Count('tournois', distinct=True),
                nb_tournois_termines=Count('tournois', filter=Q(tournois__statut='termine'), distinct=True),
                nb_evenements=Count('evenements', distinct=True),
                nb_equipes=Count('tournois__equipes', distinct=True),
                nb_interesses=Count('evenements__interesses', distinct=True),
                # Audience des tournois : joueurs distincts ayant participé + favoris reçus
                nb_joueurs=Count('tournois__equipes__membres__joueur', distinct=True),
                nb_favoris=Count('tournois__favori_par', distinct=True),
            )
            .annotate(
                score=Coalesce(
                    F('nb_tournois_termines') * 25 + F('nb_tournois') * 10
                    + F('nb_evenements') * 15 + F('nb_equipes') * 5 + F('nb_interesses') * 2,
                    0,
                    output_field=IntegerField(),
                ),
                # Points d'audience → grade promoteur (voir Utilisateur.GRADES_PROMOTEUR_SEUILS)
                points_audience=Coalesce(
                    F('nb_equipes') * 5 + F('nb_joueurs') * 2 + F('nb_favoris'),
                    0,
                    output_field=IntegerField(),
                ),
            )
            .order_by('-score', '-date_joined')
        )
