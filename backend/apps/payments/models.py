import uuid

from django.db import models
from django.conf import settings


def generer_reference():
    return f"HPC-{uuid.uuid4().hex[:12].upper()}"


class Paiement(models.Model):
    """
    Paiement encaissé via GeniusPay.
    v1 : publication d'un tournoi (2 000 FCFA, obligatoire) et
    promotion optionnelle (5 000 FCFA) par un promoteur.
    """
    TYPE_PUBLICATION_TOURNOI = 'publication_tournoi'
    TYPE_CREATION_TOURNOI = 'creation_tournoi'
    TYPE_INSCRIPTION_EQUIPE = 'inscription_equipe'
    TYPE_PROMOTION_COMPTE = 'promotion_compte'
    TYPE_PROMOTION_EQUIPE = 'promotion_equipe'
    TYPE_CHOICES = [
        (TYPE_PUBLICATION_TOURNOI, 'Promotion de tournoi'),
        (TYPE_CREATION_TOURNOI, 'Publication de tournoi'),
        (TYPE_INSCRIPTION_EQUIPE, "Inscription d'équipe"),
        (TYPE_PROMOTION_COMPTE, 'Promotion de compte joueur'),
        (TYPE_PROMOTION_EQUIPE, "Promotion d'équipe"),
    ]

    STATUT_EN_ATTENTE = 'en_attente'
    STATUT_REUSSI = 'reussi'
    STATUT_ECHOUE = 'echoue'
    STATUT_ANNULE = 'annule'
    STATUT_EXPIRE = 'expire'
    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE, 'En attente'),
        (STATUT_REUSSI, 'Réussi'),
        (STATUT_ECHOUE, 'Échoué'),
        (STATUT_ANNULE, 'Annulé'),
        (STATUT_EXPIRE, 'Expiré'),
    ]

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='paiements',
    )
    tournoi = models.ForeignKey(
        'tournaments.Tournoi',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='paiements',
    )
    # Équipe concernée pour les paiements d'inscription (500 FCFA + frais du tournoi)
    equipe = models.ForeignKey(
        'tournaments.Equipe',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='paiements',
    )
    type_paiement = models.CharField(max_length=30, choices=TYPE_CHOICES)
    montant = models.DecimalField(max_digits=10, decimal_places=0)
    devise = models.CharField(max_length=5, default='XOF')
    # Référence interne HoopCI (HPC-…) transmise à GeniusPay dans metadata
    reference = models.CharField(max_length=40, unique=True, default=generer_reference)
    # Référence GeniusPay (MTX-…) renvoyée à l'initiation
    genius_reference = models.CharField(max_length=60, blank=True, db_index=True)
    checkout_url = models.URLField(blank=True, max_length=500)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_EN_ATTENTE, db_index=True)
    # True quand le paiement a été validé sans passer par GeniusPay (dev sans clés API)
    simulation = models.BooleanField(default=False)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Paiement'
        verbose_name_plural = 'Paiements'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference} — {self.montant} {self.devise} ({self.statut})"


class Portefeuille(models.Model):
    """
    Portefeuille d'un promoteur. Les frais d'inscription des équipes (montant payé
    moins la part plateforme de 500 FCFA) y sont crédités automatiquement. Le solde
    représente ce que la plateforme doit reverser au promoteur.
    """
    promoteur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='portefeuille',
        limit_choices_to={'role': 'promoteur'},
    )
    solde = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    # Cumul historique crédité (ne diminue jamais) — utile pour les statistiques
    total_credite = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total_reverse = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Portefeuille'

    def __str__(self):
        return f"Portefeuille de {self.promoteur} — {self.solde} XOF"


class MouvementPortefeuille(models.Model):
    """Ligne de mouvement d'un portefeuille : crédit d'inscription ou reversement."""
    TYPE_CREDIT_INSCRIPTION = 'credit_inscription'
    TYPE_REVERSEMENT = 'reversement'
    TYPE_CHOICES = [
        (TYPE_CREDIT_INSCRIPTION, "Crédit d'inscription"),
        (TYPE_REVERSEMENT, 'Reversement'),
    ]

    portefeuille = models.ForeignKey(Portefeuille, on_delete=models.CASCADE, related_name='mouvements')
    type_mouvement = models.CharField(max_length=20, choices=TYPE_CHOICES)
    # Signé : positif pour un crédit, négatif pour un reversement
    montant = models.DecimalField(max_digits=12, decimal_places=0)
    paiement = models.ForeignKey(Paiement, on_delete=models.SET_NULL, null=True, blank=True, related_name='mouvements')
    libelle = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Mouvement de portefeuille'
        verbose_name_plural = 'Mouvements de portefeuille'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_mouvement_display()} {self.montant} — {self.portefeuille.promoteur}"
