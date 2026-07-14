/**
 * Constantes partagées du frontend — mêmes valeurs que le backend.
 * Toute nouvelle valeur doit être ajoutée des deux côtés (modèles Django + ici).
 */

export const COMMUNES = [
  'Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi',
  'Marcory', 'Plateau', 'Port-Bouët', 'Songon', 'Treichville', 'Yopougon',
]

/** Sports couverts par la plateforme (backend : apps/core/sports.py) */
export const SPORTS = {
  basket: 'Basketball',
  football: 'Football',
}

/** Formats de tournoi possibles pour chaque sport (validés côté serveur) */
export const FORMATS_PAR_SPORT = {
  basket: ['3x3', '5x5'],
  football: ['maracana', '7x7', '11x11'],
}

/** Nombre minimum de joueurs (tous inscrits sur HoopCI) selon le format — mêmes valeurs que le backend */
export const MEMBRES_MIN_PAR_FORMAT = {
  '3x3': 3,
  '5x5': 5,
  maracana: 6,
  '7x7': 7,
  '11x11': 11,
}

/** Libellés d'affichage des formats (le maracana est LE format street en CI) */
export const FORMAT_LABELS = {
  '3x3': '3x3',
  '5x5': '5x5',
  maracana: 'Maracana',
  '7x7': '7 vs 7',
  '11x11': '11 vs 11',
}

/** Tous les formats confondus — pour les filtres « tous sports » */
export const FORMATS = [...FORMATS_PAR_SPORT.basket, ...FORMATS_PAR_SPORT.football]

export const NIVEAUX = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  elite: 'Élite',
}

export const STATUTS = {
  ouvert: 'Ouvert',
  complet: 'Complet',
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
}

/** Statuts visibles uniquement par le promoteur propriétaire (hors filtres publics) */
export const STATUTS_PRIVES = {
  en_attente_paiement: 'En attente de paiement',
}

/** Tarif de la promotion optionnelle d'un tournoi (promoteur) */
export const TARIF_PUBLICATION_TOURNOI = 5000

/** Frais de publication d'un tournoi — obligatoires avant parution dans l'annuaire */
export const TARIF_CREATION_TOURNOI = 2000

/** Part plateforme sur l'inscription d'une équipe (+ frais du tournoi, un seul paiement) */
export const TARIF_INSCRIPTION_EQUIPE = 500

/** Promotion du compte joueur : tête du marché + gains de grade ×1,15 pendant 30 jours */
export const TARIF_PROMOTION_COMPTE = 1000

/** Promotion d'une équipe inscrite : badge + gains de grade ×1,15 pour ses membres */
export const TARIF_PROMOTION_EQUIPE = 1000

/** Classes d'âge des tournois (contrôlées à l'inscription via la date de naissance) */
export const CATEGORIES_AGE = {
  open: 'Toutes catégories',
  u15: 'U15',
  u18: 'U18',
  u21: 'U21',
  senior: 'Seniors',
  veteran35: 'Vétérans 35+',
}

export const TYPES_EVENEMENT = {
  exhibition: 'Match exhibition',
  camp: "Camp d'entraînement",
  dunk_contest: 'Concours de dunks / shoots',
  animation: 'Animation / Show',
  caritatif: 'Événement caritatif',
  autre: 'Autre',
}

export const STATUTS_EVENEMENT = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
}

/** Postes proposés selon le sport du joueur (validés côté serveur) */
export const POSTES_PAR_SPORT = {
  basket: {
    meneur: 'Meneur',
    arriere: 'Arrière',
    ailier: 'Ailier',
    ailier_fort: 'Ailier fort',
    pivot: 'Pivot',
  },
  football: {
    gardien: 'Gardien',
    defenseur: 'Défenseur',
    milieu: 'Milieu',
    attaquant: 'Attaquant',
  },
}

/** Tous les postes confondus — pour afficher le libellé d'un poste quel que soit le sport */
export const POSTES = { ...POSTES_PAR_SPORT.basket, ...POSTES_PAR_SPORT.football }

export const OFFRE_STATUTS = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
}

export const ROLES = {
  promoteur: 'Promoteur',
  joueur: 'Joueur',
  client: 'Fan / Recruteur',
}

/** Grades joueurs — mêmes seuils que le backend (apps/players/models.py) */
export const GRADES = {
  bronze: { label: 'Bronze', min: 0 },
  argent: { label: 'Argent', min: 100 },
  or: { label: 'Or', min: 300 },
  platine: { label: 'Platine', min: 700 },
  legende: { label: 'Légende', min: 1500 },
}

/** Barème : comment un joueur gagne des points de grade (base, avant multiplicateurs) */
export const BAREME_POINTS = [
  { points: 10, label: 'par tournoi joué' },
  { points: 30, label: 'par tournoi gagné' },
  { points: 15, label: 'par finale perdue' },
  { points: 50, label: 'par titre de MVP' },
]

/** Multiplicateurs, bonus et malus appliqués au barème (mêmes règles que le backend) */
export const BAREME_BONUS =
  'Le grade monte ET descend. Gains multipliés selon le niveau du tournoi (élite ×1,5 · débutant ×0,75), '
  + 'son affluence (jusqu\'à +40 %), ×1,5 sur les tournois « Promu », '
  + '×1,15 si ton compte est promu et ×1,15 si ton équipe est promue. '
  + 'Équipe incomplète (moins de joueurs inscrits que le format n\'en exige) : gains réduits de 40 %. '
  + 'Finale perdue : +20 si serrée (≤ 3 pts), +5 si lourde (≥ 10 pts). '
  + 'Éliminé avant la finale : −5 pts nets, et −5 de plus par défaite consécutive (max −15). '
  + 'Victoires consécutives : +10 par victoire d\'affilée (max +30).'

/** 2000 → "2 000 FCFA" · 0 → "Gratuit" */
export const fcfa = (n) => {
  const v = Number(n || 0)
  return v === 0 ? 'Gratuit' : `${v.toLocaleString('fr-FR')} FCFA`
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const DATE_SHORT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export const fmtDate = (iso) => (iso ? DATE_FMT.format(new Date(iso)) : '')

export const fmtDateRange = (debut, fin) => {
  if (!debut) return ''
  if (!fin || fin === debut) return fmtDate(debut)
  return `${DATE_SHORT.format(new Date(debut))} – ${fmtDate(fin)}`
}

export const initials = (nom = '?') =>
  nom.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

/** Réponses DRF paginées ({results}) ou listes brutes (actions) */
export const unwrap = (data) => data?.results ?? data ?? []

/** Gradient de secours pour les tournois sans affiche */
export const gradFor = (id) => `g${(Number(id) % 5) + 1}`

export const apiError = (err, fallback = 'Une erreur est survenue') => {
  const d = err?.response?.data
  if (!d) return fallback
  if (typeof d === 'string') return fallback
  if (d.detail) return d.detail
  const first = Object.values(d)[0]
  if (Array.isArray(first)) return first[0]
  if (typeof first === 'string') return first
  return fallback
}
