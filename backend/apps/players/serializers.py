from rest_framework import serializers
from apps.accounts.models import Utilisateur
from .models import ProfilJoueur


class ProfilJoueurPublicSerializer(serializers.ModelSerializer):
    """Lecture publique — profil mineurs masqués si is_minor=True."""
    id = serializers.IntegerField(source='utilisateur.id')
    nom_complet = serializers.SerializerMethodField()
    commune = serializers.CharField(source='utilisateur.commune')
    photo = serializers.ImageField(source='utilisateur.photo')
    taux_victoire = serializers.FloatField(read_only=True)
    badge_verifie = serializers.SerializerMethodField()
    grade_label = serializers.CharField(source='get_grade_display', read_only=True)
    grade_suivant = serializers.CharField(read_only=True)
    points_grade_suivant = serializers.IntegerField(read_only=True)
    progression_grade = serializers.FloatField(read_only=True)

    class Meta:
        model = ProfilJoueur
        fields = (
            'id', 'nom_complet', 'commune', 'photo', 'sport', 'poste',
            'taille', 'bio', 'tournois_joues', 'tournois_gagnes',
            'mvp_count', 'taux_victoire', 'badge_verifie',
            'grade', 'grade_label', 'points', 'grade_suivant',
            'points_grade_suivant', 'progression_grade',
        )

    def get_nom_complet(self, obj):
        return obj.utilisateur.get_full_name() or obj.utilisateur.username

    def get_badge_verifie(self, obj):
        carte = getattr(obj.utilisateur, 'carte_transfert', None)
        return carte.badge_verifie if carte else False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Masquer les infos personnelles des mineurs pour les non-authentifiés
        request = self.context.get('request')
        if instance.utilisateur.is_minor:
            if not request or not request.user.is_authenticated:
                data['nom_complet'] = 'Joueur mineur'
                data['photo'] = None
                data['commune'] = instance.utilisateur.commune  # commune reste visible
        return data


class ProfilJoueurUpdateSerializer(serializers.ModelSerializer):
    """Champs modifiables par le joueur lui-même (les stats restent gérées par Celery)."""
    class Meta:
        model = ProfilJoueur
        fields = ('sport', 'poste', 'taille', 'bio', 'date_naissance')

    def validate(self, attrs):
        # Cohérence sport / poste : un footballeur ne peut pas être « pivot »
        # (en PATCH partiel, on complète avec les valeurs déjà en base)
        sport = attrs.get('sport') or getattr(self.instance, 'sport', None)
        poste = attrs.get('poste') if 'poste' in attrs else getattr(self.instance, 'poste', '')
        if sport and poste and poste not in ProfilJoueur.POSTES_PAR_SPORT.get(sport, ()):
            if 'poste' not in attrs:
                # Changement de sport sans nouveau poste : on efface l'ancien poste
                # plutôt que de bloquer (le joueur le re-choisira dans son profil)
                attrs['poste'] = ''
            else:
                labels = dict(ProfilJoueur.POSTE_CHOICES)
                autorises = ', '.join(labels[p] for p in ProfilJoueur.POSTES_PAR_SPORT.get(sport, ()))
                raise serializers.ValidationError(
                    {'poste': f"Poste invalide pour ce sport. Postes possibles : {autorises}."}
                )
        return attrs
