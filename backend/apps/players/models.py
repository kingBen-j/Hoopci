from django.db import models
from django.conf import settings

from apps.core.sports import SPORT_CHOICES, SPORT_BASKET, SPORT_FOOTBALL


class ProfilJoueur(models.Model):
    # Postes basket
    POSTE_MENEUR = 'meneur'
    POSTE_ARRIERE = 'arriere'
    POSTE_AILIER = 'ailier'
    POSTE_AILIER_FORT = 'ailier_fort'
    POSTE_PIVOT = 'pivot'
    # Postes football
    POSTE_GARDIEN = 'gardien'
    POSTE_DEFENSEUR = 'defenseur'
    POSTE_MILIEU = 'milieu'
    POSTE_ATTAQUANT = 'attaquant'

    POSTE_CHOICES = [
        (POSTE_MENEUR, 'Meneur'),
        (POSTE_ARRIERE, 'Arrière'),
        (POSTE_AILIER, 'Ailier'),
        (POSTE_AILIER_FORT, 'Ailier Fort'),
        (POSTE_PIVOT, 'Pivot'),
        (POSTE_GARDIEN, 'Gardien'),
        (POSTE_DEFENSEUR, 'Défenseur'),
        (POSTE_MILIEU, 'Milieu'),
        (POSTE_ATTAQUANT, 'Attaquant'),
    ]

    # Postes autorisés selon le sport (validé par ProfilJoueurUpdateSerializer)
    POSTES_PAR_SPORT = {
        SPORT_BASKET: (POSTE_MENEUR, POSTE_ARRIERE, POSTE_AILIER, POSTE_AILIER_FORT, POSTE_PIVOT),
        SPORT_FOOTBALL: (POSTE_GARDIEN, POSTE_DEFENSEUR, POSTE_MILIEU, POSTE_ATTAQUANT),
    }

    GRADE_BRONZE = 'bronze'
    GRADE_ARGENT = 'argent'
    GRADE_OR = 'or'
    GRADE_PLATINE = 'platine'
    GRADE_LEGENDE = 'legende'

    GRADE_CHOICES = [
        (GRADE_BRONZE, 'Bronze'),
        (GRADE_ARGENT, 'Argent'),
        (GRADE_OR, 'Or'),
        (GRADE_PLATINE, 'Platine'),
        (GRADE_LEGENDE, 'Légende'),
    ]

    # Barème des points (appliqué par recalculer_stats_joueur, tournoi par tournoi,
    # dans l'ordre chronologique). Le grade peut MONTER comme DESCENDRE :
    #   base : joué 10 · gagné +30 · MVP +50
    #   finale perdue : +20 serrée (≤ 3 pts d'écart) · +15 standard · +5 lourde (≥ 10)
    #   éliminé avant la finale : −15 (net −5 avec la participation)
    #   × niveau du tournoi · × affluence · × 1,5 si tournoi « Promu » (gains seulement)
    #   séries : victoires consécutives +10/+20/+30 · défaites consécutives −5/−10/−15
    POINTS_TOURNOI_JOUE = 10
    POINTS_TOURNOI_GAGNE = 30
    POINTS_MVP = 50
    POINTS_FINALE_PERDUE = 15
    POINTS_FINALE_SERREE = 20      # finale perdue de 3 points ou moins
    POINTS_FINALE_LOURDE = 5       # finale perdue de 10 points ou plus
    ECART_FINALE_SERREE = 3
    ECART_FINALE_LOURDE = 10
    MALUS_DEFAITE = 15             # éliminé avant la finale
    # Un tournoi élite rapporte plus qu'un tournoi débutant
    MULTIPLICATEUR_NIVEAU = {'debutant': 0.75, 'intermediaire': 1.0, 'elite': 1.5}
    # Gros bonus des tournois promus par la plateforme (appliqué aux gains uniquement)
    MULTIPLICATEUR_PROMU = 1.5
    # Bonus d'affluence : +2,5 % de points par équipe inscrite, plafonné à +40 %
    AFFLUENCE_PLAFOND_EQUIPES = 16
    # Incitations : compte joueur promu et équipe promue boostent les gains
    MULTIPLICATEUR_COMPTE_PROMU = 1.15
    MULTIPLICATEUR_EQUIPE_PROMUE = 1.15
    # Effectif incomplet (moins de joueurs inscrits que le format n'en exige) :
    # les gains du tournoi sont fortement réduits — tous les joueurs doivent
    # avoir un compte sur la plateforme et avoir rejoint l'équipe
    MULTIPLICATEUR_EFFECTIF_INCOMPLET = 0.6
    # Victoires consécutives : +10 pts par victoire au-delà de la première, plafonné
    BONUS_SERIE = 10
    BONUS_SERIE_MAX = 30
    # Défaites sèches consécutives : −5 pts par défaite au-delà de la première, plafonné
    MALUS_SERIE_DEFAITES = 5
    MALUS_SERIE_DEFAITES_MAX = 15

    # Seuils de grade (points minimum), du plus haut au plus bas
    GRADE_SEUILS = [
        (GRADE_LEGENDE, 1500),
        (GRADE_PLATINE, 700),
        (GRADE_OR, 300),
        (GRADE_ARGENT, 100),
        (GRADE_BRONZE, 0),
    ]

    utilisateur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profil_joueur',
    )
    sport = models.CharField(max_length=10, choices=SPORT_CHOICES, default=SPORT_BASKET, db_index=True)
    poste = models.CharField(max_length=20, choices=POSTE_CHOICES, blank=True, db_index=True)
    date_naissance = models.DateField(null=True, blank=True)
    taille = models.PositiveSmallIntegerField(null=True, blank=True, help_text='en cm')
    bio = models.TextField(blank=True)

    # Compteurs mis à jour automatiquement par Celery après chaque saisie de Resultat
    # Ne jamais modifier ces champs directement depuis une vue joueur — intégrité des stats
    tournois_joues = models.PositiveIntegerField(default=0)
    tournois_gagnes = models.PositiveIntegerField(default=0)
    mvp_count = models.PositiveIntegerField(default=0)

    # Grade calculé par Celery en même temps que les compteurs — jamais depuis une vue
    points = models.PositiveIntegerField(default=0)
    grade = models.CharField(max_length=10, choices=GRADE_CHOICES, default=GRADE_BRONZE, db_index=True)

    class Meta:
        verbose_name = 'Profil joueur'
        verbose_name_plural = 'Profils joueurs'

    def __str__(self):
        return f"Profil de {self.utilisateur}"

    @property
    def taux_victoire(self):
        if self.tournois_joues == 0:
            return 0.0
        return round(self.tournois_gagnes / self.tournois_joues * 100, 1)

    @staticmethod
    def grade_pour_points(points):
        for grade, seuil in ProfilJoueur.GRADE_SEUILS:
            if points >= seuil:
                return grade
        return ProfilJoueur.GRADE_BRONZE

    @property
    def grade_suivant(self):
        """Prochain grade à atteindre, None si Légende."""
        seuils = list(reversed(self.GRADE_SEUILS))  # du plus bas au plus haut
        for grade, seuil in seuils:
            if self.points < seuil:
                return grade
        return None

    @property
    def points_grade_suivant(self):
        suivant = self.grade_suivant
        if suivant is None:
            return None
        return dict(self.GRADE_SEUILS)[suivant]

    @property
    def progression_grade(self):
        """Progression 0-100 % entre le seuil du grade actuel et celui du suivant."""
        cible = self.points_grade_suivant
        if cible is None:
            return 100.0
        plancher = dict(self.GRADE_SEUILS)[self.grade]
        if cible == plancher:
            return 0.0
        return round(min((self.points - plancher) / (cible - plancher) * 100, 100), 1)
