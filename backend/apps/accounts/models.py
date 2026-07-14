from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    # « Promoteur » : rôle unique — publie tournois ET événements
    # (les anciens rôles organisateur et promoteur sont fusionnés en un seul)
    ROLE_PROMOTEUR = 'promoteur'
    ROLE_JOUEUR = 'joueur'
    ROLE_CLIENT = 'client'

    ROLE_CHOICES = [
        (ROLE_PROMOTEUR, 'Promoteur'),
        (ROLE_JOUEUR, 'Joueur'),
        (ROLE_CLIENT, 'Client / Recruteur'),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    commune = models.CharField(max_length=100, blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to='profils/', blank=True, null=True)
    # Nécessaire pour modérer les profils mineurs dès la conception (cahier des charges §10)
    is_minor = models.BooleanField(default=False)
    consentement_parental = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role']

    # Grade promoteur — évolue avec l'AUDIENCE de ses tournois (calculé à la volée
    # par PromoteurClassementView) : équipes inscrites ×5 + joueurs participants ×2
    # + favoris ×1. Seuils (points minimum), du plus haut au plus bas.
    GRADES_PROMOTEUR_SEUILS = [
        ('legende', 1000),
        ('platine', 400),
        ('or', 150),
        ('argent', 50),
        ('bronze', 0),
    ]

    @staticmethod
    def grade_promoteur_pour(points_audience):
        for grade, seuil in Utilisateur.GRADES_PROMOTEUR_SEUILS:
            if (points_audience or 0) >= seuil:
                return grade
        return 'bronze'

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_promoteur(self):
        return self.role == self.ROLE_PROMOTEUR

    @property
    def is_joueur(self):
        return self.role == self.ROLE_JOUEUR
