"""
API d'administration HoopCI — réservée au staff (is_staff).

Alimente le dashboard /admin du frontend : statistiques globales,
suivi des paiements GeniusPay et gestion de tous les contenus.
"""
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
from rest_framework import decorators, serializers, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Utilisateur
from apps.tournaments.models import Tournoi, Equipe, Participation
from apps.events.models import Evenement, InteretEvenement
from apps.market.models import CarteTransfert, Offre, RechercheRecruteur
from apps.payments.models import Paiement
from apps.players.models import ProfilJoueur
from apps.players.tasks import recalculer_stats_joueur


def _par_cle(queryset, champ):
    """{'valeur': n, …} pour un GROUP BY simple."""
    return {row[champ]: row['n'] for row in queryset.values(champ).annotate(n=Count('id'))}


class StatsAdminView(APIView):
    """GET /api/admin/stats/ — tous les indicateurs de la plateforme."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        paiements = Paiement.objects.all()
        revenus_confirmes = paiements.filter(statut=Paiement.STATUT_REUSSI).aggregate(s=Sum('montant'))['s'] or 0
        montant_en_attente = paiements.filter(statut=Paiement.STATUT_EN_ATTENTE).aggregate(s=Sum('montant'))['s'] or 0

        revenus_par_mois = [
            {'mois': row['mois'].strftime('%Y-%m'), 'montant': int(row['s'] or 0), 'nb': row['n']}
            for row in (
                paiements.filter(statut=Paiement.STATUT_REUSSI)
                .annotate(mois=TruncMonth('created_at'))
                .values('mois').annotate(s=Sum('montant'), n=Count('id'))
                .order_by('mois')
            )
        ]

        return Response({
            'utilisateurs': {
                'total': Utilisateur.objects.count(),
                'par_role': _par_cle(Utilisateur.objects, 'role'),
                'mineurs': Utilisateur.objects.filter(is_minor=True).count(),
                'desactives': Utilisateur.objects.filter(is_active=False).count(),
            },
            'tournois': {
                'total': Tournoi.objects.count(),
                'par_statut': _par_cle(Tournoi.objects, 'statut'),
                'promus': Tournoi.objects.filter(mis_en_avant=True).count(),
                'equipes': Equipe.objects.count(),
                'equipes_payees': Equipe.objects.filter(payee=True).count(),
                'equipes_promues': Equipe.objects.filter(mise_en_avant=True).count(),
                'participations': Participation.objects.count(),
            },
            'evenements': {
                'total': Evenement.objects.count(),
                'par_statut': _par_cle(Evenement.objects, 'statut'),
                'interesses': InteretEvenement.objects.count(),
            },
            'marche': {
                'cartes': CarteTransfert.objects.count(),
                'disponibles': CarteTransfert.objects.filter(disponible=True).count(),
                'verifiees': CarteTransfert.objects.filter(badge_verifie=True).count(),
                'offres': Offre.objects.count(),
                'offres_par_statut': _par_cle(Offre.objects, 'statut'),
                'recherches_recruteurs': RechercheRecruteur.objects.count(),
            },
            'grades': _par_cle(ProfilJoueur.objects, 'grade'),
            'paiements': {
                'total': paiements.count(),
                'par_statut': _par_cle(paiements, 'statut'),
                'revenus_confirmes': int(revenus_confirmes),
                'montant_en_attente': int(montant_en_attente),
                'revenus_par_mois': revenus_par_mois,
            },
        })


# ---------- Paiements (lecture seule) ----------

class PaiementAdminSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.SerializerMethodField()
    utilisateur_email = serializers.CharField(source='utilisateur.email', read_only=True)
    tournoi_titre = serializers.CharField(source='tournoi.titre', read_only=True, default=None)
    equipe_nom = serializers.CharField(source='equipe.nom', read_only=True, default=None)
    type_label = serializers.CharField(source='get_type_paiement_display', read_only=True)

    class Meta:
        model = Paiement
        fields = ('id', 'reference', 'genius_reference', 'utilisateur_nom', 'utilisateur_email',
                  'tournoi', 'tournoi_titre', 'equipe_nom', 'type_paiement', 'type_label',
                  'montant', 'devise', 'statut', 'simulation', 'created_at')

    def get_utilisateur_nom(self, obj):
        return obj.utilisateur.get_full_name() or obj.utilisateur.username


class PaiementAdminViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Paiement.objects.select_related('utilisateur', 'tournoi', 'equipe').order_by('-created_at')
    serializer_class = PaiementAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ('statut', 'type_paiement', 'simulation')
    search_fields = ('reference', 'genius_reference', 'utilisateur__email')


# ---------- Utilisateurs ----------

class UtilisateurAdminSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = ('id', 'nom_complet', 'email', 'role', 'commune', 'telephone',
                  'is_active', 'is_minor', 'is_staff', 'date_joined')
        read_only_fields = ('id', 'email', 'is_minor', 'is_staff', 'date_joined')

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class UtilisateurAdminViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.order_by('-date_joined')
    serializer_class = UtilisateurAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'head', 'options']
    filterset_fields = ('role', 'is_active', 'is_minor')
    search_fields = ('email', 'first_name', 'last_name', 'username', 'commune')

    def partial_update(self, request, *args, **kwargs):
        cible = self.get_object()
        if cible.is_superuser:
            return Response({'detail': 'Un superutilisateur ne peut pas être modifié ici.'},
                            status=status.HTTP_403_FORBIDDEN)
        if cible == request.user and request.data.get('is_active') in (False, 'false', 'False'):
            return Response({'detail': 'Tu ne peux pas désactiver ton propre compte.'},
                            status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)


# ---------- Tournois ----------

class TournoiAdminSerializer(serializers.ModelSerializer):
    organisateur_nom = serializers.SerializerMethodField()
    organisateur_email = serializers.CharField(source='organisateur.email', read_only=True)
    nb_equipes = serializers.IntegerField(source='equipes.count', read_only=True)

    class Meta:
        model = Tournoi
        fields = ('id', 'titre', 'commune', 'format', 'niveau', 'categorie_age', 'date_debut', 'date_fin',
                  'statut', 'mis_en_avant', 'frais_inscription',
                  'organisateur_nom', 'organisateur_email', 'nb_equipes', 'sport', 'created_at')
        read_only_fields = ('id', 'titre', 'commune', 'format', 'niveau', 'categorie_age', 'date_debut',
                            'date_fin', 'frais_inscription', 'created_at')

    def get_organisateur_nom(self, obj):
        return obj.organisateur.get_full_name() or obj.organisateur.username


class TournoiAdminViewSet(viewsets.ModelViewSet):
    """L'admin peut changer statut / mise en avant (offerte) et supprimer un tournoi."""
    queryset = Tournoi.objects.select_related('organisateur').prefetch_related('equipes').order_by('-created_at')
    serializer_class = TournoiAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    filterset_fields = ('statut', 'mis_en_avant', 'commune')
    search_fields = ('titre', 'commune', 'organisateur__email')


# ---------- Événements ----------

class EvenementAdminSerializer(serializers.ModelSerializer):
    organisateur_nom = serializers.SerializerMethodField()
    organisateur_email = serializers.CharField(source='organisateur.email', read_only=True)
    nb_interesses = serializers.IntegerField(source='interesses.count', read_only=True)

    class Meta:
        model = Evenement
        fields = ('id', 'titre', 'type_evenement', 'commune', 'date_debut', 'date_fin',
                  'statut', 'prix_entree', 'sport', 'organisateur_nom', 'organisateur_email',
                  'nb_interesses', 'created_at')
        read_only_fields = ('id', 'titre', 'type_evenement', 'commune', 'date_debut',
                            'date_fin', 'prix_entree', 'created_at')

    def get_organisateur_nom(self, obj):
        return obj.organisateur.get_full_name() or obj.organisateur.username


class EvenementAdminViewSet(viewsets.ModelViewSet):
    queryset = Evenement.objects.select_related('organisateur').prefetch_related('interesses').order_by('-created_at')
    serializer_class = EvenementAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    filterset_fields = ('statut', 'type_evenement', 'commune')
    search_fields = ('titre', 'commune', 'organisateur__email')


# ---------- Cartes de transfert (modération marché) ----------

class CarteAdminSerializer(serializers.ModelSerializer):
    joueur_nom = serializers.SerializerMethodField()
    joueur_email = serializers.CharField(source='joueur.email', read_only=True)
    grade = serializers.CharField(source='joueur.profil_joueur.grade', read_only=True, default='')

    class Meta:
        model = CarteTransfert
        fields = ('id', 'joueur_nom', 'joueur_email', 'grade', 'disponible',
                  'badge_verifie', 'mise_en_avant', 'mise_en_avant_jusqu', 'updated_at')
        read_only_fields = ('id', 'disponible', 'updated_at')

    def get_joueur_nom(self, obj):
        return obj.joueur.get_full_name() or obj.joueur.username


class CarteAdminViewSet(viewsets.ModelViewSet):
    queryset = CarteTransfert.objects.select_related('joueur', 'joueur__profil_joueur').order_by('-updated_at')
    serializer_class = CarteAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'head', 'options']
    filterset_fields = ('disponible', 'badge_verifie', 'mise_en_avant')
    search_fields = ('joueur__email', 'joueur__first_name', 'joueur__last_name')


# ---------- Équipes (inscriptions payées, promotions, effectifs) ----------

class EquipeAdminSerializer(serializers.ModelSerializer):
    tournoi_titre = serializers.CharField(source='tournoi.titre', read_only=True)
    effectif = serializers.IntegerField(source='membres.count', read_only=True)
    effectif_min = serializers.ReadOnlyField()

    class Meta:
        model = Equipe
        fields = ('id', 'nom', 'tournoi', 'tournoi_titre', 'payee', 'mise_en_avant',
                  'effectif', 'effectif_min', 'created_at')
        read_only_fields = ('id', 'nom', 'tournoi', 'created_at')


class EquipeAdminViewSet(viewsets.ModelViewSet):
    """L'admin peut régulariser une inscription (payee), offrir une promotion
    ou supprimer une équipe."""
    queryset = Equipe.objects.select_related('tournoi').prefetch_related('membres').order_by('-created_at')
    serializer_class = EquipeAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    filterset_fields = ('payee', 'mise_en_avant', 'tournoi')
    search_fields = ('nom', 'tournoi__titre')


# ---------- Offres du marché (modération) ----------

class OffreAdminSerializer(serializers.ModelSerializer):
    emetteur_email = serializers.CharField(source='emetteur.email', read_only=True)
    joueur_email = serializers.CharField(source='joueur.email', read_only=True)

    class Meta:
        model = Offre
        fields = ('id', 'emetteur_email', 'joueur_email', 'message', 'statut', 'created_at')


class OffreAdminViewSet(viewsets.ModelViewSet):
    """Lecture + suppression (modération des messages abusifs)."""
    queryset = Offre.objects.select_related('emetteur', 'joueur').order_by('-created_at')
    serializer_class = OffreAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'delete', 'head', 'options']
    filterset_fields = ('statut',)
    search_fields = ('emetteur__email', 'joueur__email', 'message')


# ---------- Profils joueurs (grades et statistiques) ----------

class ProfilJoueurAdminSerializer(serializers.ModelSerializer):
    joueur_nom = serializers.SerializerMethodField()
    joueur_email = serializers.CharField(source='utilisateur.email', read_only=True)

    class Meta:
        model = ProfilJoueur
        fields = ('id', 'utilisateur', 'joueur_nom', 'joueur_email', 'sport', 'poste',
                  'tournois_joues', 'tournois_gagnes', 'mvp_count', 'points', 'grade')
        read_only_fields = fields

    def get_joueur_nom(self, obj):
        return obj.utilisateur.get_full_name() or obj.utilisateur.username


class ProfilJoueurAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture des grades/statistiques + action de recalcul forcé."""
    queryset = ProfilJoueur.objects.select_related('utilisateur').order_by('-points')
    serializer_class = ProfilJoueurAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ('sport', 'grade')
    search_fields = ('utilisateur__email', 'utilisateur__first_name', 'utilisateur__last_name')

    @decorators.action(detail=True, methods=['post'])
    def recalculer(self, request, pk=None):
        """Recalcule stats et grade du joueur (correction après modération)."""
        profil = self.get_object()
        recalculer_stats_joueur(profil.utilisateur_id)
        profil.refresh_from_db()
        return Response(self.get_serializer(profil).data)
