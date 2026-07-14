from django.db import models
from django.conf import settings

from apps.core.sports import SPORT_CHOICES, SPORT_BASKET


class Evenement(models.Model):
    """
    Événement basket ou football hors compétition (exhibition, camp, animation…)
    publié par un promoteur.
    """
    TYPE_EXHIBITION = 'exhibition'
    TYPE_CAMP = 'camp'
    TYPE_DUNK_CONTEST = 'dunk_contest'
    TYPE_ANIMATION = 'animation'
    TYPE_CARITATIF = 'caritatif'
    TYPE_AUTRE = 'autre'

    TYPE_CHOICES = [
        (TYPE_EXHIBITION, 'Match exhibition'),
        (TYPE_CAMP, "Camp d'entraînement"),
        (TYPE_DUNK_CONTEST, 'Concours de dunks / shoots'),
        (TYPE_ANIMATION, 'Animation / Show'),
        (TYPE_CARITATIF, 'Événement caritatif'),
        (TYPE_AUTRE, 'Autre'),
    ]

    STATUT_A_VENIR = 'a_venir'
    STATUT_EN_COURS = 'en_cours'
    STATUT_TERMINE = 'termine'
    STATUT_ANNULE = 'annule'
    STATUT_CHOICES = [
        (STATUT_A_VENIR, 'À venir'),
        (STATUT_EN_COURS, 'En cours'),
        (STATUT_TERMINE, 'Terminé'),
        (STATUT_ANNULE, 'Annulé'),
    ]

    organisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='evenements',
        limit_choices_to={'role': 'promoteur'},
    )
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sport = models.CharField(max_length=10, choices=SPORT_CHOICES, default=SPORT_BASKET, db_index=True)
    type_evenement = models.CharField(max_length=20, choices=TYPE_CHOICES, db_index=True)
    commune = models.CharField(max_length=100, db_index=True)
    lieu = models.CharField(max_length=200)
    date_debut = models.DateField(db_index=True)
    date_fin = models.DateField()
    heure = models.TimeField(null=True, blank=True)
    prix_entree = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    affiche = models.ImageField(upload_to='evenements/affiches/', blank=True, null=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_A_VENIR, db_index=True)
    contact = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Événement'
        verbose_name_plural = 'Événements'
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['commune', 'date_debut', 'statut']),
        ]

    def __str__(self):
        return f"{self.titre} — {self.commune} ({self.date_debut})"


class InteretEvenement(models.Model):
    """« Je suis intéressé » — mesure l'attractivité d'un événement."""
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interets_evenements',
    )
    evenement = models.ForeignKey(Evenement, on_delete=models.CASCADE, related_name='interesses')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('utilisateur', 'evenement')
        verbose_name = 'Intérêt événement'

    def __str__(self):
        return f"{self.utilisateur} intéressé par {self.evenement}"
