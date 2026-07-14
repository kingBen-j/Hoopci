import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { X, TriangleAlert, PartyPopper, Trophy, Plus } from 'lucide-react'
import { getEvenements, getMesEvenements } from '../../api/events.js'
import EvenementCard from '../../components/evenements/EvenementCard.jsx'
import { Spinner, Empty } from '../../components/ui/bits.jsx'
import { COMMUNES, SPORTS, TYPES_EVENEMENT, unwrap } from '../../lib/constants.js'
import { useAuthStore } from '../../store/authStore.js'
import { useSportStore } from '../../store/sportStore.js'

// Filtres envoyés à l'API (?sport=&type_evenement=&commune=&search=)
const EMPTY_FILTERS = { sport: '', type_evenement: '', commune: '', search: '' }

/**
 * Agenda des événements basket & football (exhibitions, camps, animations…).
 * Onglets : à venir / tous / mes événements (promoteur connecté).
 */
export default function EvenementsPage() {
  const [tab, setTab] = useState('a_venir') // 'a_venir' | 'tous' | 'miens'
  const sportPrefere = useSportStore((s) => s.sportPrefere)
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, sport: sportPrefere })
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const peutPublier = user?.role === 'promoteur'

  // Le filtre sport suit la préférence (sport du joueur ou choix du recruteur)
  useEffect(() => {
    setFilters((f) => (f.sport === sportPrefere ? f : { ...f, sport: sportPrefere }))
  }, [sportPrefere])

  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  if (tab === 'a_venir') params.statut = 'a_venir'

  const publics = useQuery({
    queryKey: ['evenements', tab, params],
    queryFn: () => getEvenements(params).then((r) => r.data),
    enabled: tab !== 'miens',
  })

  const miens = useQuery({
    queryKey: ['mes-evenements'],
    queryFn: () => getMesEvenements().then((r) => r.data),
    enabled: tab === 'miens' && peutPublier,
  })

  const query = tab === 'miens' ? miens : publics
  const items = unwrap(query.data)
  const hasFilters = Object.values(filters).some(Boolean)
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <span className="kicker orange">Agenda basket & football</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 32, marginTop: 10 }}>
          Événe<span style={{ color: 'var(--orange)' }}>ments</span>
        </h1>
        {peutPublier && (
          <button className="btn sm" onClick={() => navigate('/creer-evenement')}>
            <span><Plus size={15} /> Publier un événement</span>
          </button>
        )}
      </div>
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 14px' }}>
        Exhibitions, camps, dunk contests, animations… publiés par les promoteurs.
      </p>

      <div className="tabs">
        <button className={tab === 'a_venir' ? 'active' : ''} onClick={() => setTab('a_venir')}>
          À venir
        </button>
        <button className={tab === 'tous' ? 'active' : ''} onClick={() => setTab('tous')}>
          Tous
        </button>
        {peutPublier && (
          <button className={tab === 'miens' ? 'active' : ''} onClick={() => setTab('miens')}>
            Mes événements
          </button>
        )}
      </div>

      {tab !== 'miens' && (
        <div className="filters">
          <input
            className="chip"
            placeholder="Rechercher un événement…"
            value={filters.search}
            onChange={set('search')}
            aria-label="Rechercher un événement"
          />
          {/* Filtre par sport (basket / football) */}
          <select className={`chip ${filters.sport ? 'active' : ''}`} value={filters.sport} onChange={set('sport')}>
            <option value="">Sport</option>
            {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={`chip ${filters.type_evenement ? 'active' : ''}`} value={filters.type_evenement} onChange={set('type_evenement')}>
            <option value="">Type</option>
            {Object.entries(TYPES_EVENEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={`chip ${filters.commune ? 'active' : ''}`} value={filters.commune} onChange={set('commune')}>
            <option value="">Commune</option>
            {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasFilters && (
            <button className="chip active" onClick={() => setFilters(EMPTY_FILTERS)}>
              <X size={13} style={{ verticalAlign: '-2px' }} /> Effacer
            </button>
          )}
          <button className="chip" onClick={() => navigate('/promoteurs')}>
            <Trophy size={13} style={{ verticalAlign: '-2px' }} /> Top promoteurs
          </button>
        </div>
      )}

      {query.isLoading && <Spinner />}
      {query.isError && <Empty icon={<TriangleAlert size={44} />}>Impossible de charger les événements.</Empty>}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <Empty icon={<PartyPopper size={44} />}>
          {tab === 'miens'
            ? "Tu n'as pas encore publié d'événement."
            : 'Aucun événement ne correspond pour le moment.'}
        </Empty>
      )}

      <div className="grid">
        {items.map((e) => <EvenementCard key={e.id} evenement={e} />)}
      </div>
    </div>
  )
}
