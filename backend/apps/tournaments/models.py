from django.db import models
from django.conf import settings

from apps.core.sports import SPORT_CHOICES, SPORT_BASKET, SPORT_FOOTBALL


class Tournoi(models.Model):
    FORMAT_3X3 = '3x3'
    FORMAT_5X5 = '5x5'
    FORMAT_MARACANA = 'maracana'
    FORMAT_7X7 = '7x7'
    FORMAT_11X11 = '11x11'
    FORMAT_CHOICES = [
        (FORMAT_3X3, '3x3'),
        (FORMAT_5X5, '5x5'),
        (FORMAT_MARACANA, 'Maracana'),
        (FORMAT_7X7, '7 vs 7'),
        (FORMAT_11X11, '11 vs 11'),
    ]
    # Formats autorisés selon le sport (validé par TournoiCreateSerializer)
    FORMATS_PAR_SPORT = {
        SPORT_BASKET: (FORMAT_3X3, FORMAT_5X5),
        SPORT_FOOTBALL: (FORMAT_MARACANA, FORMAT_7X7, FORMAT_11X11),
    }
    # Effectif minimum d'une équipe selon le format — tous les joueurs doivent avoir
    # un compte sur la plateforme ; un effectif incomplet réduit les points de grade
    MEMBRES_MIN_PAR_FORMAT = {
        FORMAT_3X3: 3,
        FORMAT_5X5: 5,
        FORMAT_MARACANA: 6,
        FORMAT_7X7: 7,
        FORMAT_11X11: 11,
    }

    NIVEAU_DEBUTANT = 'debutant'
    NIVEAU_INTERMEDIAIRE = 'intermediaire'
    NIVEAU_ELITE = 'elite'
    NIVEAU_CHOICES = [
        (NIVEAU_DEBUTANT, 'Débutant'),
        (NIVEAU_INTERMEDIAIRE, 'Intermédiaire'),
        (NIVEAU_ELITE, 'Élite'),
    ]

    # Classes d'âge — en plus du niveau. L'âge du joueur (date de naissance du
    # profil) est contrôlé à la date de début du tournoi quand il rejoint une équipe.
    CATEGORIE_OPEN = 'open'
    CATEGORIE_U15 = 'u15'
    CATEGORIE_U18 = 'u18'
    CATEGORIE_U21 = 'u21'
    CATEGORIE_SENIOR = 'senior'
    CATEGORIE_VETERAN = 'veteran35'
    CATEGORIE_AGE_CHOICES = [
        (CATEGORIE_OPEN, 'Toutes catégories'),
        (CATEGORIE_U15, 'U15 — moins de 15 ans'),
        (CATEGORIE_U18, 'U18 — moins de 18 ans'),
        (CATEGORIE_U21, 'U21 — moins de 21 ans'),
        (CATEGORIE_SENIOR, 'Seniors — 18 ans et plus'),
        (CATEGORIE_VETERAN, 'Vétérans — 35 ans et plus'),
    ]
    # Bornes (âge_min, âge_max) à la date de début — None = pas de borne
    BORNES_CATEGORIE_AGE = {
        CATEGORIE_OPEN: (None, None),
        CATEGORIE_U15: (None, 14),
        CATEGORIE_U18: (None, 17),
        CATEGORIE_U21: (None, 20),
        CATEGORIE_SENIOR: (18, None),
        CATEGORIE_VETERAN: (35, None),
    }

    # Invisible du public tant que les frais de publication ne sont pas payés (apps.payments)
    STATUT_EN_ATTENTE_PAIEMENT = 'en_attente_paiement'
    STATUT_OUVERT = 'ouvert'
    STATUT_COMPLET = 'complet'
    STATUT_EN_COURS = 'en_cours'
    STATUT_TERMINE = 'termine'
    STATUT_ANNULE = 'annule'
    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE_PAIEMENT, 'En attente de paiement'),
        (STATUT_OUVERT, 'Ouvert'),
        (STATUT_COMPLET, 'Complet'),
        (STATUT_EN_COURS, 'En cours'),
        (STATUT_TERMINE, 'Terminé'),
        (STATUT_ANNULE, 'Annulé'),
    ]

    organisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tournois',
        limit_choices_to={'role': 'promoteur'},
    )
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sport = models.CharField(max_length=10, choices=SPORT_CHOICES, default=SPORT_BASKET, db_index=True)
    commune = models.CharField(max_length=100, db_index=True)
    lieu = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    date_debut = models.DateField(db_index=True)
    date_fin = models.DateField()
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, db_index=True)
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES)
    categorie_age = models.CharField(
        max_length=12, choices=CATEGORIE_AGE_CHOICES, default=CATEGORIE_OPEN, db_index=True,
    )
    frais_inscription = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    affiche = models.ImageField(upload_to='tournois/affiches/', blank=True, null=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_OUVERT, db_index=True)
    # Tournoi promu par la plateforme — activé automatiquement quand le promoteur
    # propriétaire paie la promotion (5 000 FCFA via GeniusPay),
    # jamais modifiable via l'API
    mis_en_avant = models.BooleanField(default=False, db_index=True)
    nombre_equipes_max = models.PositiveIntegerField(null=True, blank=True)
    contact = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tournoi'
        verbose_name_plural = 'Tournois'
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['commune', 'date_debut', 'statut']),
            models.Index(fields=['format', 'niveau']),
        ]

    def __str__(self):
        return f"{self.titre} — {self.commune} ({self.date_debut})"

    def accepte_joueur(self, utilisateur):
        """(ok, message) — l'âge du joueur correspond-il à la classe d'âge du tournoi ?"""
        age_min, age_max = self.BORNES_CATEGORIE_AGE.get(self.categorie_age, (None, None))
        if age_min is None and age_max is None:
            return True, ''
        naissance = getattr(getattr(utilisateur, 'profil_joueur', None), 'date_naissance', None)
        if not naissance:
            return False, "Renseigne ta date de naissance dans ton profil pour rejoindre ce tournoi."
        age = (
            self.date_debut.year - naissance.year
            - ((self.date_debut.month, self.date_debut.day) < (naissance.month, naissance.day))
        )
        label = dict(self.CATEGORIE_AGE_CHOICES)[self.categorie_age]
        if (age_min is not None and age < age_min) or (age_max is not None and age > age_max):
            return False, f"Ce tournoi est réservé à la catégorie {label}."
        return True, ''


class Equipe(models.Model):
    tournoi = models.ForeignKey(Tournoi, on_delete=models.CASCADE, related_name='equipes')
    nom = models.CharField(max_length=100)
    # L'inscription n'est effective qu'après paiement (500 FCFA plateforme + frais du
    # tournoi, via apps.payments). Les équipes ajoutées par le promoteur sont exemptées.
    payee = models.BooleanField(default=False, db_index=True)
    # Équipe promue (option payante, apps.payments) : badge + points de grade boostés
    mise_en_avant = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def effectif_min(self):
        return Tournoi.MEMBRES_MIN_PAR_FORMAT.get(self.tournoi.format, 0)

    @property
    def effectif_complet(self):
        """Tous les joueurs requis par le format ont un compte et ont rejoint l'équipe."""
        return self.membres.count() >= self.effectif_min

    class Meta:
        unique_together = ('tournoi', 'nom')
        verbose_name = 'Équipe'

    def __str__(self):
        return f"{self.nom} — {self.tournoi.titre}"


class Participation(models.Model):
    joueur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='participations',
    )
    equipe = models.ForeignKey(Equipe, on_delete=models.CASCADE, related_name='membres')

    class Meta:
        unique_together = ('joueur', 'equipe')
        verbose_name = 'Participation'

    def __str__(self):
        return f"{self.joueur} dans {self.equipe}"


class Resultat(models.Model):
    tournoi = models.OneToOneField(Tournoi, on_delete=models.CASCADE, related_name='resultat')
    equipe_gagnante = models.ForeignKey(
        Equipe,
        on_delete=models.SET_NULL,
        null=True,
        related_name='victoires',
    )
    # Finale : équipe battue et score (ex. 21 – 15), optionnels
    equipe_finaliste = models.ForeignKey(
        Equipe,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finales_perdues',
    )
    score_gagnante = models.PositiveSmallIntegerField(null=True, blank=True)
    score_finaliste = models.PositiveSmallIntegerField(null=True, blank=True)
    mvp = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mvps',
    )
    saisi_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='resultats_saisis',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Résultat'

    def __str__(self):
        return f"Résultat de {self.tournoi}"


class FavoriTournoi(models.Model):
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favoris_tournois',
    )
    tournoi = models.ForeignKey(Tournoi, on_delete=models.CASCADE, related_name='favori_par')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('utilisateur', 'tournoi')
        verbose_name = 'Favori'

    def __str__(self):
        return f"{self.utilisateur} aime {self.tournoi}"
