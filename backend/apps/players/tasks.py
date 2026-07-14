from django.db import transaction

try:
    from celery import shared_task
    _celery_available = True
except ImportError:
    _celery_available = False

    def shared_task(fn):
        """Stub quand Celery n'est pas installé — la tâche s'exécute directement."""
        fn.delay = fn
        return fn


@shared_task
def recalculer_stats_joueur(joueur_id: int) -> None:
    """
    Recalcule les compteurs et le grade d'un joueur après la saisie d'un Resultat.
    En prod : appelé via .delay() par Celery.
    En dev sans Celery : CELERY_TASK_ALWAYS_EAGER=True ou appel direct.

    Barème (voir constantes de ProfilJoueur) — pour chaque tournoi à résultat,
    dans l'ordre chronologique. Le grade peut monter comme descendre :
      gains   : joué 10 · gagné +30 · MVP +50 · finale perdue +5/+15/+20 selon l'écart
      malus   : éliminé avant la finale −15 (net −5)
      bonus   : × niveau · × affluence · × 1,5 si tournoi « Promu » (gains seulement)
      séries  : victoires +10 par victoire consécutive (max +30) ·
                défaites sèches −5 par défaite consécutive (max −15)
    """
    from django.db.models import Count, Q

    from apps.players.models import ProfilJoueur
    from apps.tournaments.models import Participation, Resultat

    try:
        profil = ProfilJoueur.objects.get(utilisateur_id=joueur_id)
    except ProfilJoueur.DoesNotExist:
        return

    participations = Participation.objects.filter(joueur_id=joueur_id)
    tournoi_ids = participations.values_list('equipe__tournoi_id', flat=True)
    equipe_ids_joueur = set(participations.values_list('equipe_id', flat=True))

    # Équipe du joueur par tournoi (promotion + effectif) et taille des effectifs
    equipes_joueur = {
        p.equipe.tournoi_id: p.equipe
        for p in participations.select_related('equipe')
    }
    effectifs = dict(
        Participation.objects.filter(equipe_id__in=equipe_ids_joueur)
        .values_list('equipe_id')
        .annotate(n=Count('id'))
        .values_list('equipe_id', 'n')
    )
    # Compte promu (carte de transfert mise en avant, non expirée) : gains boostés
    carte = getattr(profil.utilisateur, 'carte_transfert', None)
    compte_promu = bool(carte and carte.mise_en_avant_active)

    resultats = (
        Resultat.objects.filter(tournoi_id__in=tournoi_ids)
        .select_related('tournoi')
        .annotate(nb_equipes=Count('tournoi__equipes', distinct=True,
                                   filter=Q(tournoi__equipes__payee=True)))
        .order_by('tournoi__date_debut', 'tournoi_id')
    )

    tournois_joues = tournois_gagnes = mvp_count = 0
    points = 0.0
    serie_victoires = serie_defaites = 0
    for r in resultats:
        tournois_joues += 1
        victoire = r.equipe_gagnante_id in equipe_ids_joueur
        finale_perdue = r.equipe_finaliste_id in equipe_ids_joueur

        total = ProfilJoueur.POINTS_TOURNOI_JOUE
        if victoire:
            tournois_gagnes += 1
            total += ProfilJoueur.POINTS_TOURNOI_GAGNE
        elif finale_perdue:
            # « Comment » la finale a été perdue : l'écart de score module le bonus
            bonus_finale = ProfilJoueur.POINTS_FINALE_PERDUE
            if r.score_gagnante is not None and r.score_finaliste is not None:
                ecart = r.score_gagnante - r.score_finaliste
                if ecart <= ProfilJoueur.ECART_FINALE_SERREE:
                    bonus_finale = ProfilJoueur.POINTS_FINALE_SERREE
                elif ecart >= ProfilJoueur.ECART_FINALE_LOURDE:
                    bonus_finale = ProfilJoueur.POINTS_FINALE_LOURDE
            total += bonus_finale
        else:
            # Éliminé avant la finale : le tournoi coûte des points (net −5)
            total -= ProfilJoueur.MALUS_DEFAITE
        if r.mvp_id == joueur_id:
            mvp_count += 1
            total += ProfilJoueur.POINTS_MVP

        total *= ProfilJoueur.MULTIPLICATEUR_NIVEAU.get(r.tournoi.niveau, 1.0)
        total *= 1 + min(r.nb_equipes or 0, ProfilJoueur.AFFLUENCE_PLAFOND_EQUIPES) / 40
        # Bonus appliqués aux gains uniquement, jamais aux malus
        if total > 0:
            from apps.tournaments.models import Tournoi
            equipe = equipes_joueur.get(r.tournoi_id)
            if r.tournoi.mis_en_avant:
                total *= ProfilJoueur.MULTIPLICATEUR_PROMU
            if compte_promu:
                total *= ProfilJoueur.MULTIPLICATEUR_COMPTE_PROMU
            if equipe is not None:
                if equipe.mise_en_avant:
                    total *= ProfilJoueur.MULTIPLICATEUR_EQUIPE_PROMUE
                # Effectif incomplet : tous les joueurs du format doivent être inscrits
                minimum = Tournoi.MEMBRES_MIN_PAR_FORMAT.get(r.tournoi.format, 0)
                if effectifs.get(equipe.id, 0) < minimum:
                    total *= ProfilJoueur.MULTIPLICATEUR_EFFECTIF_INCOMPLET
        points += total

        # Séries : une victoire enchaîne les bonus, les défaites sèches s'enchaînent
        # en malus ; une finale perdue casse les deux séries sans pénalité
        if victoire:
            serie_victoires += 1
            serie_defaites = 0
            if serie_victoires >= 2:
                points += min((serie_victoires - 1) * ProfilJoueur.BONUS_SERIE,
                              ProfilJoueur.BONUS_SERIE_MAX)
        elif finale_perdue:
            serie_victoires = serie_defaites = 0
        else:
            serie_defaites += 1
            serie_victoires = 0
            if serie_defaites >= 2:
                points -= min((serie_defaites - 1) * ProfilJoueur.MALUS_SERIE_DEFAITES,
                              ProfilJoueur.MALUS_SERIE_DEFAITES_MAX)

    points = max(0, int(round(points)))
    grade = ProfilJoueur.grade_pour_points(points)

    with transaction.atomic():
        ProfilJoueur.objects.filter(pk=profil.pk).update(
            tournois_joues=tournois_joues,
            tournois_gagnes=tournois_gagnes,
            mvp_count=mvp_count,
            points=points,
            grade=grade,
        )
