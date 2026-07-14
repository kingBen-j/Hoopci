from rest_framework import serializers
from apps.players.serializers import ProfilJoueurPublicSerializer
from .models import CarteTransfert, Offre


class CarteTransfertSerializer(serializers.ModelSerializer):
    joueur = ProfilJoueurPublicSerializer(source='joueur.profil_joueur', read_only=True)
    mise_en_avant_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = CarteTransfert
        fields = (
            'id', 'joueur', 'disponible', 'description', 'pretentions',
            'mise_en_avant_active', 'badge_verifie', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'joueur', 'mise_en_avant_active', 'badge_verifie', 'created_at', 'updated_at')


class CarteTransfertUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarteTransfert
        fields = ('disponible', 'description', 'pretentions')


class OffreCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offre
        fields = ('joueur', 'message')

    def validate_joueur(self, joueur):
        request = self.context['request']
        if joueur == request.user:
            raise serializers.ValidationError("Vous ne pouvez pas vous envoyer une offre.")
        if joueur.role != 'joueur':
            raise serializers.ValidationError("Cet utilisateur n'est pas un joueur.")
        if not hasattr(joueur, 'carte_transfert') or not joueur.carte_transfert.disponible:
            raise serializers.ValidationError("Ce joueur n'est pas disponible sur le marché.")
        return joueur

    def create(self, validated_data):
        validated_data['emetteur'] = self.context['request'].user
        return super().create(validated_data)


class OffreSerializer(serializers.ModelSerializer):
    emetteur_nom = serializers.SerializerMethodField()
    joueur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Offre
        fields = ('id', 'emetteur', 'emetteur_nom', 'joueur', 'joueur_nom', 'message', 'statut', 'created_at')
        read_only_fields = ('id', 'emetteur', 'created_at')

    def get_emetteur_nom(self, obj):
        return obj.emetteur.get_full_name() or obj.emetteur.username

    def get_joueur_nom(self, obj):
        return obj.joueur.get_full_name() or obj.joueur.username


class OffreReponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offre
        fields = ('statut',)

    def validate_statut(self, value):
        if value not in (Offre.STATUT_ACCEPTEE, Offre.STATUT_REFUSEE):
            raise serializers.ValidationError("Statut invalide. Utiliser 'acceptee' ou 'refusee'.")
        return value
