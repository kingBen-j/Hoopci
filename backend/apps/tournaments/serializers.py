from rest_framework import serializers
from apps.accounts.serializers import UtilisateurSerializer
from .models import Tournoi, Equipe, Participation, Resultat, FavoriTournoi


class EquipeSerializer(serializers.ModelSerializer):
    membres = serializers.SerializerMethodField()
    effectif_min = serializers.ReadOnlyField()
    effectif_complet = serializers.ReadOnlyField()

    class Meta:
        model = Equipe
        fields = ('id', 'nom', 'payee', 'mise_en_avant', 'effectif_min', 'effectif_complet', 'membres', 'created_at')
        read_only_fields = ('id', 'payee', 'mise_en_avant', 'membres', 'created_at')

    def get_membres(self, obj):
        return [
            {'id': p.joueur_id, 'nom': p.joueur.get_full_name() or p.joueur.username}
            for p in obj.membres.select_related('joueur')
        ]


class ResultatSerializer(serializers.ModelSerializer):
    equipe_gagnante_nom = serializers.CharField(source='equipe_gagnante.nom', read_only=True)
    equipe_finaliste_nom = serializers.CharField(source='equipe_finaliste.nom', read_only=True)
    mvp_nom = serializers.SerializerMethodField()

    class Meta:
        model = Resultat
        fields = (
            'id', 'equipe_gagnante', 'equipe_gagnante_nom',
            'equipe_finaliste', 'equipe_finaliste_nom',
            'score_gagnante', 'score_finaliste',
            'mvp', 'mvp_nom', 'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def get_mvp_nom(self, obj):
        if obj.mvp:
            return obj.mvp.get_full_name() or obj.mvp.username
        return None

    def validate_equipe_gagnante(self, equipe):
        tournoi = self.context['tournoi']
        if equipe.tournoi != tournoi:
            raise serializers.ValidationError("Cette équipe n'appartient pas à ce tournoi.")
        return equipe

    def validate_equipe_finaliste(self, equipe):
        if equipe is None:
            return equipe
        tournoi = self.context['tournoi']
        if equipe.tournoi != tournoi:
            raise serializers.ValidationError("Cette équipe n'appartient pas à ce tournoi.")
        return equipe

    def validate_mvp(self, user):
        if user is None:
            return user
        tournoi = self.context['tournoi']
        if not Participation.objects.filter(equipe__tournoi=tournoi, joueur=user).exists():
            raise serializers.ValidationError("Ce joueur ne participe pas à ce tournoi.")
        return user

    def validate(self, attrs):
        gagnante = attrs.get('equipe_gagnante')
        finaliste = attrs.get('equipe_finaliste')
        if gagnante and finaliste and gagnante == finaliste:
            raise serializers.ValidationError({'equipe_finaliste': "La finaliste doit être différente de l'équipe gagnante."})
        return attrs


class PalmaresSerializer(serializers.ModelSerializer):
    """Récap public d'un tournoi terminé : vainqueur, score de la finale, MVP."""
    organisateur_nom = serializers.SerializerMethodField()
    resultat = ResultatSerializer(read_only=True)

    class Meta:
        model = Tournoi
        fields = (
            'id', 'titre', 'sport', 'commune', 'lieu', 'date_debut', 'date_fin',
            'format', 'niveau', 'affiche', 'mis_en_avant',
            'organisateur_nom', 'resultat',
        )

    def get_organisateur_nom(self, obj):
        return obj.organisateur.get_full_name() or obj.organisateur.username


class TournoiListSerializer(serializers.ModelSerializer):
    """Version allégée pour les listes (annuaire, favoris, recommandations)."""
    organisateur_nom = serializers.SerializerMethodField()
    nb_equipes = serializers.SerializerMethodField()

    class Meta:
        model = Tournoi
        fields = (
            'id', 'titre', 'sport', 'commune', 'lieu', 'date_debut', 'date_fin',
            'format', 'niveau', 'categorie_age', 'statut', 'mis_en_avant', 'frais_inscription',
            'affiche', 'organisateur_nom', 'nb_equipes',
        )

    def get_nb_equipes(self, obj):
        # Seules les inscriptions payées comptent (utilise le prefetch de la vue)
        return sum(1 for e in obj.equipes.all() if e.payee)

    def get_organisateur_nom(self, obj):
        return obj.organisateur.get_full_name() or obj.organisateur.username


class TournoiDetailSerializer(serializers.ModelSerializer):
    """Fiche complète d'un tournoi : promoteur, équipes inscrites, résultat, favori."""
    organisateur = UtilisateurSerializer(read_only=True)
    equipes = serializers.SerializerMethodField()
    resultat = ResultatSerializer(read_only=True)
    is_favori = serializers.SerializerMethodField()

    def get_equipes(self, obj):
        # Une équipe n'apparaît qu'une fois son inscription payée
        return EquipeSerializer([e for e in obj.equipes.all() if e.payee], many=True).data

    class Meta:
        model = Tournoi
        fields = (
            'id', 'titre', 'description', 'sport', 'commune', 'lieu',
            'latitude', 'longitude', 'date_debut', 'date_fin',
            'format', 'niveau', 'categorie_age', 'statut', 'mis_en_avant', 'frais_inscription',
            'affiche', 'contact', 'nombre_equipes_max', 'organisateur',
            'equipes', 'resultat', 'is_favori', 'created_at',
        )
        read_only_fields = ('id', 'organisateur', 'created_at')

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return FavoriTournoi.objects.filter(utilisateur=request.user, tournoi=obj).exists()


class TournoiCreateSerializer(serializers.ModelSerializer):
    """Création et modification d'un tournoi par son promoteur."""
    class Meta:
        model = Tournoi
        # id en lecture seule : le front redirige vers le détail ou le paiement après création
        fields = (
            'id', 'titre', 'description', 'sport', 'commune', 'lieu',
            'latitude', 'longitude', 'date_debut', 'date_fin',
            'format', 'niveau', 'categorie_age', 'frais_inscription', 'affiche',
            'contact', 'nombre_equipes_max', 'statut',
        )
        read_only_fields = ('id',)

    def validate(self, attrs):
        # Cohérence des dates : la fin ne peut pas précéder le début
        if attrs.get('date_fin') and attrs.get('date_debut'):
            if attrs['date_fin'] < attrs['date_debut']:
                raise serializers.ValidationError({'date_fin': "La date de fin doit être après la date de début."})

        # Cohérence sport / format : un tournoi de football ne peut pas être en 3x3
        # (en PATCH partiel, on complète avec les valeurs déjà en base)
        sport = attrs.get('sport') or getattr(self.instance, 'sport', None)
        format_ = attrs.get('format') or getattr(self.instance, 'format', None)
        if sport and format_ and format_ not in Tournoi.FORMATS_PAR_SPORT.get(sport, ()):
            labels = dict(Tournoi.FORMAT_CHOICES)
            autorises = ', '.join(labels[f] for f in Tournoi.FORMATS_PAR_SPORT.get(sport, ()))
            raise serializers.ValidationError(
                {'format': f"Format invalide pour ce sport. Formats possibles : {autorises}."}
            )
        return attrs

    def validate_statut(self, value):
        # Le passage « en attente de paiement » → publié est réservé au circuit
        # de paiement (apps.payments) : pas de contournement par PATCH
        if self.instance and self.instance.statut == Tournoi.STATUT_EN_ATTENTE_PAIEMENT \
                and value != Tournoi.STATUT_EN_ATTENTE_PAIEMENT:
            raise serializers.ValidationError(
                "Ce tournoi sera publié automatiquement après paiement des frais de publication."
            )
        if value == Tournoi.STATUT_EN_ATTENTE_PAIEMENT \
                and not (self.instance and self.instance.statut == value):
            raise serializers.ValidationError("Statut géré automatiquement par le paiement.")
        return value

    def create(self, validated_data):
        validated_data['organisateur'] = self.context['request'].user
        # La publication est payante (TARIF_CREATION_TOURNOI) : le tournoi reste
        # invisible du public jusqu'à confirmation du paiement (apps.payments)
        validated_data['statut'] = Tournoi.STATUT_EN_ATTENTE_PAIEMENT
        return super().create(validated_data)
