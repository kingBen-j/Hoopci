"""
Suggestions automatiques de joueurs pour les recruteurs.

Les habitudes viennent de deux sources :
- les filtres utilisés dans l'annuaire / le marché (RechercheRecruteur)
- les offres déjà envoyées (poste et commune des joueurs ciblés)
"""
from collections import Counter

from .models import CarteTransfert, Offre, RechercheRecruteur

ROLES_RECRUTEURS = ('client', 'promoteur')
NB_RECHERCHES_ANALYSEES = 50


def enregistrer_recherche(request):
    """Trace les filtres d'une recherche de joueurs — recruteurs uniquement."""
    user = request.user
    if not user.is_authenticated or user.role not in ROLES_RECRUTEURS:
        return
    params = request.query_params
    poste = params.get('poste', '')[:20]
    commune = params.get('commune', '')[:100]
    grade = params.get('grade', '')[:10]
    texte = params.get('search', '')[:200]
    if not any((poste, commune, grade, texte)):
        return
    RechercheRecruteur.objects.create(
        utilisateur=user, poste=poste, commune=commune, grade=grade, texte=texte,
    )


def _habitudes(user):
    """Compte les critères les plus utilisés (recherches récentes + offres envoyées)."""
    postes, communes, grades = Counter(), Counter(), Counter()

    recherches = RechercheRecruteur.objects.filter(utilisateur=user)[:NB_RECHERCHES_ANALYSEES]
    for r in recherches:
        if r.poste:
            postes[r.poste] += 1
        if r.commune:
            communes[r.commune.lower()] += 1
        if r.grade:
            grades[r.grade] += 1

    # Une offre envoyée pèse plus lourd qu'une simple recherche
    offres = Offre.objects.filter(emetteur=user).select_related('joueur__profil_joueur')[:30]
    for o in offres:
        profil = getattr(o.joueur, 'profil_joueur', None)
        if profil and profil.poste:
            postes[profil.poste] += 2
        if o.joueur.commune:
            communes[o.joueur.commune.lower()] += 2

    return postes, communes, grades


def suggerer_joueurs(user, limite=6):
    """Retourne [(score, carte, raisons)] des meilleurs profils disponibles pour ce recruteur."""
    postes, communes, grades = _habitudes(user)
    deja_contactes = set(Offre.objects.filter(emetteur=user).values_list('joueur_id', flat=True))

    candidats = (
        CarteTransfert.objects
        .select_related('joueur', 'joueur__profil_joueur')
        .filter(disponible=True, joueur__is_active=True)
        .exclude(joueur_id__in=deja_contactes)
    )

    suggestions = []
    for carte in candidats:
        profil = getattr(carte.joueur, 'profil_joueur', None)
        if profil is None:
            continue
        score, raisons = 0.0, []

        if profil.poste and postes.get(profil.poste):
            score += 30
            raisons.append(f"Poste que tu recherches souvent")
        if carte.joueur.commune and communes.get(carte.joueur.commune.lower()):
            score += 20
            raisons.append(f"À {carte.joueur.commune}, ta zone de recherche")
        if profil.grade and grades.get(profil.grade):
            score += 15
            raisons.append(f"Grade {profil.get_grade_display()} que tu cibles")

        # Performances : départagent et font émerger les meilleurs profils
        performance = profil.taux_victoire * 0.3 + profil.mvp_count * 4 + min(profil.points, 1000) * 0.02
        score += performance
        if profil.taux_victoire >= 50 and profil.tournois_joues >= 2:
            raisons.append(f"{round(profil.taux_victoire)} % de victoires")
        if profil.mvp_count > 0:
            raisons.append(f"{profil.mvp_count}× MVP")

        if carte.mise_en_avant_active:
            score += 8
        if carte.badge_verifie:
            score += 5
            raisons.append('Profil vérifié')

        if not raisons:
            raisons.append('Parmi les meilleurs joueurs disponibles')
        suggestions.append((score, carte, raisons))

    suggestions.sort(key=lambda x: -x[0])
    # Écarter les profils sans aucun signal (score nul), sauf si rien d'autre à proposer
    avec_signal = [s for s in suggestions if s[0] > 0]
    return (avec_signal or suggestions)[:limite]
