from django.db import models
from django.conf import settings
from django.utils import timezone


class CarteTransfert(models.Model):
    joueur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='carte_transfert',
        limit_choices_to={'role': 'joueur'},
    )
    disponible = models.BooleanField(default=True, db_index=True)
    description = models.TextField(blank=True, help_text='Ce que le joueur recherche')
    pretentions = models.TextField(blank=True, help_text='Niveau souhaité, zone géographique, etc.')
    mise_en_avant = models.BooleanField(default=False, db_index=True)
    mise_en_avant_jusqu = models.DateTimeField(null=True, blank=True)
    badge_verifie = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Carte de transfert'
        verbose_name_plural = 'Cartes de transfert'
        ordering = ['-mise_en_avant', '-created_at']

    def __str__(self):
        return f"Carte de {self.joueur}"

    @property
    def mise_en_avant_active(self):
        if not self.mise_en_avant:
            return False
        if self.mise_en_avant_jusqu and self.mise_en_avant_jusqu < timezone.now():
            return False
        return True


class RechercheRecruteur(models.Model):
    """
    Trace des recherches effectuées par un recruteur (client ou promoteur)
    sur l'annuaire / le marché. Alimente les suggestions
    automatiques de joueurs selon ses habitudes.
    """
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recherches_recruteur',
    )
    poste = models.CharField(max_length=20, blank=True)
    commune = models.CharField(max_length=100, blank=True)
    grade = models.CharField(max_length=10, blank=True)
    texte = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Recherche recruteur'
        verbose_name_plural = 'Recherches recruteurs'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['utilisateur', '-created_at'])]

    def __str__(self):
        return f"{self.utilisateur} — poste={self.poste or '∅'} commune={self.commune or '∅'} grade={self.grade or '∅'}"


class Offre(models.Model):
    STATUT_EN_ATTENTE = 'en_attente'
    STATUT_ACCEPTEE = 'acceptee'
    STATUT_REFUSEE = 'refusee'

    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE, 'En attente'),
        (STATUT_ACCEPTEE, 'Acceptée'),
        (STATUT_REFUSEE, 'Refusée'),
    ]

    emetteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='offres_envoyees',
    )
    joueur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='offres_recues',
        limit_choices_to={'role': 'joueur'},
    )
    message = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_EN_ATTENTE, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Offre'
        verbose_name_plural = 'Offres'
        ordering = ['-created_at']

    def __str__(self):
        return f"Offre de {self.emetteur} → {self.joueur} ({self.statut})"
