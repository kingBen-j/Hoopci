from rest_framework import serializers
from apps.accounts.serializers import UtilisateurSerializer
from .models import Evenement, InteretEvenement


class EvenementListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste de l'agenda des événements."""
    organisateur_nom = serializers.SerializerMethodField()
    organisateur_role = serializers.CharField(source='organisateur.role', read_only=True)
    nb_interesses = serializers.IntegerField(source='interesses.count', read_only=True)

    class Meta:
        model = Evenement
        fields = (
            'id', 'titre', 'sport', 'type_evenement', 'commune', 'lieu',
            'date_debut', 'date_fin', 'heure', 'prix_entree', 'affiche',
            'statut', 'organisateur_nom', 'organisateur_role', 'nb_interesses',
        )

    def get_organisateur_nom(self, obj):
        return obj.organisateur.get_full_name() or obj.organisateur.username


class EvenementDetailSerializer(serializers.ModelSerializer):
    """Fiche complète d'un événement : promoteur, intéressés, statut."""
    organisateur = UtilisateurSerializer(read_only=True)
    nb_interesses = serializers.IntegerField(source='interesses.count', read_only=True)
    is_interesse = serializers.SerializerMethodField()

    class Meta:
        model = Evenement
        fields = (
            'id', 'titre', 'description', 'sport', 'type_evenement', 'commune', 'lieu',
            'date_debut', 'date_fin', 'heure', 'prix_entree', 'affiche',
            'statut', 'contact', 'organisateur', 'nb_interesses', 'is_interesse',
            'created_at',
        )
        read_only_fields = ('id', 'organisateur', 'created_at')

    def get_is_interesse(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return InteretEvenement.objects.filter(utilisateur=request.user, evenement=obj).exists()


class EvenementCreateSerializer(serializers.ModelSerializer):
    """Création et modification d'un événement par son promoteur."""
    class Meta:
        model = Evenement
        # id en lecture seule : le front redirige vers le détail après création
        fields = (
            'id', 'titre', 'description', 'sport', 'type_evenement', 'commune', 'lieu',
            'date_debut', 'date_fin', 'heure', 'prix_entree', 'affiche',
            'statut', 'contact',
        )
        read_only_fields = ('id',)

    def validate(self, attrs):
        if attrs.get('date_fin') and attrs.get('date_debut'): 
            if attrs['date_fin'] < attrs['date_debut']:
                raise serializers.ValidationError({'date_fin': "La date de fin doit être après la date de début."})
        return attrs

    def create(self, validated_data):
        validated_data['organisateur'] = self.context['request'].user
        return super().create(validated_data)
