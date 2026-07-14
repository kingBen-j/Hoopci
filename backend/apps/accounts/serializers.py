from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Utilisateur


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = Utilisateur
        fields = ('email', 'username', 'password', 'first_name', 'last_name', 'role', 'commune', 'telephone', 'is_minor')
        extra_kwargs = {
            'username': {'required': False},
        }

    def validate(self, attrs):
        if attrs.get('is_minor') and attrs.get('role') == Utilisateur.ROLE_PROMOTEUR:
            raise serializers.ValidationError({'role': "Un mineur ne peut pas être promoteur."})
        return attrs

    def create(self, validated_data):
        # Générer un username unique depuis l'email si non fourni
        # (deux emails différents peuvent avoir le même préfixe : israel@gmail.com / israel@yahoo.fr)
        if not validated_data.get('username'):
            base = validated_data['email'].split('@')[0]
            username = base
            suffixe = 1
            while Utilisateur.objects.filter(username=username).exists():
                suffixe += 1
                username = f"{base}{suffixe}"
            validated_data['username'] = username

        password = validated_data.pop('password')
        user = Utilisateur(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UtilisateurSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'nom_complet',
                  'role', 'commune', 'telephone', 'photo', 'is_minor', 'is_staff', 'date_joined')
        read_only_fields = ('id', 'email', 'role', 'is_minor', 'is_staff', 'date_joined')

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class UpdateMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ('first_name', 'last_name', 'commune', 'telephone', 'photo')


class PromoteurClassementSerializer(serializers.ModelSerializer):
    """Classement des promoteurs — champs annotés par la vue."""
    nom_complet = serializers.SerializerMethodField()
    nb_tournois = serializers.IntegerField(read_only=True)
    nb_tournois_termines = serializers.IntegerField(read_only=True)
    nb_evenements = serializers.IntegerField(read_only=True)
    nb_equipes = serializers.IntegerField(read_only=True)
    nb_interesses = serializers.IntegerField(read_only=True)
    nb_joueurs = serializers.IntegerField(read_only=True)
    nb_favoris = serializers.IntegerField(read_only=True)
    score = serializers.IntegerField(read_only=True)
    points_audience = serializers.IntegerField(read_only=True)
    grade = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = (
            'id', 'nom_complet', 'photo', 'commune', 'role',
            'nb_tournois', 'nb_tournois_termines', 'nb_evenements',
            'nb_equipes', 'nb_interesses', 'nb_joueurs', 'nb_favoris',
            'score', 'points_audience', 'grade',
        )

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username

    def get_grade(self, obj):
        return Utilisateur.grade_promoteur_pour(getattr(obj, 'points_audience', 0))
