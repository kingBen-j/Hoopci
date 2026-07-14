import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, TriangleAlert, Users, Info, Sparkles } from 'lucide-react'
import { getCartes, getSuggestions } from '../../api/market.js'
import { getJoueurs } from '../../api/players.js'
import PlayerCard from '../../components/joueurs/PlayerCard.jsx'
import { Spinner, Empty } from '../../components/ui/bits.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useSportStore } from '../../store/sportStore.js'
import { COMMUNES, SPORTS, POSTES, POSTES_PAR_SPORT, GRADES, BAREME_POINTS, BAREME_BONUS } from '../../lib/constants.js'

// Filtres envoyés à l'API (?sport=&poste=&commune=&grade=&search=)
const EMPTY_FILTERS = { sport: '', poste: '', commune: '', grade: '', search: '' }
// Rôles autorisés à voir les suggestions automatiques de joueurs
const ROLES_RECRUTEURS = ['client', 'promoteur']

/**
 * Annuaire et marché des joueurs (basketteurs & footballeurs).
 * Onglet « Sur le marché » : cartes de transfert disponibles.
 * Onglet « Tous les joueurs » : tous les profils publics.
 */
export default function JoueursPage() {
  const [tab, setTab] = useState('marche') // 'marche' | 'tous'
  const sportPrefere = useSportStore((s) => s.sportPrefere)
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, sport: sportPrefere })
  const [showGrades, setShowGrades] = useState(false)
  const { user } = useAuthStore()
  const estRecruteur = ROLES_RECRUTEURS.includes(user?.role)

  // Le filtre sport suit la préférence (sport du joueur ou choix du recruteur)
  useEffect(() => {
    setFilters((f) => (f.sport === sportPrefere ? f : { ...f, sport: sportPrefere, poste: '' }))
  }, [sportPrefere])

  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))

  const marche = useQuery({
    queryKey: ['cartes', params],
    queryFn: () => getCartes(params).then((r) => r.data),
    enabled: tab === 'marche',
  })

  const tous = useQuery({
    queryKey: ['joueurs', params],
    queryFn: () => getJoueurs(params).then((r) => r.data),
    enabled: tab === 'tous',
  })

  const query = tab === 'marche' ? marche : tous
  const items = query.data?.results ?? []
  const hasFilters = Object.values(filters).some(Boolean)
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <span className="kicker">Marché de talents</span>
      <h1 style={{ fontSize: 32, marginTop: 10 }}>
        Joueurs <span style={{ color: 'var(--green)' }}>disponibles</span>
      </h1>
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 14px' }}>
        Des statistiques vérifiées, issues des résultats réels des tournois — infalsifiables.
      </p>

      {estRecruteur && tab === 'marche' && <SuggestionsSection />}

      <div className="tabs">
        <button className={tab === 'marche' ? 'active' : ''} onClick={() => setTab('marche')}>
          Sur le marché
        </button>
        <button className={tab === 'tous' ? 'active' : ''} onClick={() => setTab('tous')}>
          Tous les joueurs
        </button>
      </div>

      <div className="filters">
        <input
          className="chip"
          placeholder="Rechercher un joueur…"
          value={filters.search}
          onChange={set('search')}
          aria-label="Rechercher un joueur"
        />
        {/* Filtre sport : change aussi la liste des postes proposés */}
        <select
          className={`chip ${filters.sport ? 'active' : ''}`}
          value={filters.sport}
          onChange={(e) => setFilters((f) => ({ ...f, sport: e.target.value, poste: '' }))}
        >
          <option value="">Sport</option>
          {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={`chip ${filters.poste ? 'active' : ''}`} value={filters.poste} onChange={set('poste')}>
          <option value="">Poste</option>
          {/* Postes du sport sélectionné, ou tous les postes si aucun sport choisi */}
          {Object.entries(filters.sport ? POSTES_PAR_SPORT[filters.sport] : POSTES)
            .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={`chip ${filters.commune ? 'active' : ''}`} value={filters.commune} onChange={set('commune')}>
          <option value="">Commune</option>
          {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={`chip ${filters.grade ? 'active' : ''}`} value={filters.grade} onChange={set('grade')}>
          <option value="">Grade</option>
          {Object.entries(GRADES).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
        </select>
        {hasFilters && (
          <button className="chip active" onClick={() => setFilters(EMPTY_FILTERS)}>
            <X size={13} style={{ verticalAlign: '-2px' }} /> Effacer
          </button>
        )}
        <button className="chip" onClick={() => setShowGrades((v) => !v)}>
          <Info size={13} style={{ verticalAlign: '-2px' }} /> Grades
        </button>
      </div>

      {showGrades && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Les grades de joueur</h3>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
            Chaque joueur gagne des points automatiquement avec les résultats officiels :{' '}
            {BAREME_POINTS.map((b) => `${b.points} pts ${b.label}`).join(' · ')}. Le grade évolue tout seul.
          </p>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{BAREME_BONUS}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(GRADES).map(([k, g]) => (
              <span key={k} className={`grade-badge gr-${k}`}>
                <span>{g.label} · {g.min}+ pts</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {query.isLoading && <Spinner />}
      {query.isError && <Empty icon={<TriangleAlert size={44} />}>Impossible de charger les joueurs.</Empty>}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <Empty icon={<Users size={44} />}>
          {tab === 'marche'
            ? 'Aucun joueur disponible sur le marché avec ces critères.'
            : 'Aucun joueur trouvé.'}
        </Empty>
      )}

      <div className="grid two">
        {tab === 'marche'
          ? items.map((c) => <PlayerCard key={c.id} joueur={c.joueur} carte={c} />)
          : items.map((j) => <PlayerCard key={j.id} joueur={j} />)}
      </div>
    </div>
  )
}

/** Joueurs suggérés automatiquement au recruteur selon ses habitudes de recherche et ses offres. */
function SuggestionsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['suggestions-joueurs'],
    queryFn: () => getSuggestions().then((r) => r.data),
  })

  if (isLoading || !data?.length) return null

  return (
    <div className="panel" style={{ marginBottom: 18, borderColor: 'var(--orange)' }}>
      <h3><Sparkles size={16} style={{ verticalAlign: '-2px' }} /> Suggérés pour toi</h3>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        Sélection automatique d'après tes recherches et les offres que tu as envoyées — affinée à chaque visite.
      </p>
      <div className="grid two">
        {data.slice(0, 4).map((c) => (
          <div key={c.id}>
            <PlayerCard joueur={c.joueur} carte={c} />
            {c.raisons?.length > 0 && (
              <div className="raisons">
                {c.raisons.map((r) => <span key={r} className="raison-chip">{r}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
