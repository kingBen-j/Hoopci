import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { X, TriangleAlert, Sparkles } from 'lucide-react'
import { getTournois, getTournoisRecommandes } from '../api/tournaments.js'
import TournoiCard from '../components/tournois/TournoiCard.jsx'
import Footer from '../components/layout/Footer.jsx'
import { Spinner, Empty } from '../components/ui/bits.jsx'
import { COMMUNES, SPORTS, FORMATS_PAR_SPORT, FORMAT_LABELS, FORMATS, NIVEAUX, STATUTS, CATEGORIES_AGE } from '../lib/constants.js'
import { useAuthStore } from '../store/authStore.js'
import { useSportStore } from '../store/sportStore.js'

// Filtres de l'annuaire — envoyés tels quels à l'API (?sport=&commune=&format=…)
const EMPTY_FILTERS = { sport: '', commune: '', format: '', niveau: '', categorie_age: '', statut: '', search: '' }

// Photos d'arrière-plan du héro — mélange basket / football, en fondu enchaîné
const HERO_IMAGES = ['/hero.webp', '/hero/foot-2.webp', '/hero/basket-2.webp', '/hero/foot-1.webp', '/hero/basket-3.webp']
const HERO_INTERVAL_MS = 7000

/**
 * Page d'accueil : héro, tournois recommandés (joueur connecté),
 * annuaire des tournois basket & football avec filtres, sponsors.
 */
export default function HomePage() {
  const sportPrefere = useSportStore((s) => s.sportPrefere)
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, sport: sportPrefere })
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Le filtre sport suit la préférence (sport du joueur ou choix du recruteur),
  // modifiable librement sur la page ensuite
  useEffect(() => {
    setFilters((f) => (f.sport === sportPrefere ? f : { ...f, sport: sportPrefere, format: '' }))
    setPage(1)
  }, [sportPrefere])

  // Rotation des photos du héro (fondu croisé via .hero-bg.visible)
  const [heroIdx, setHeroIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length), HERO_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const params = Object.fromEntries(
    Object.entries({ ...filters, page }).filter(([, v]) => v !== '' && v !== 1),
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tournois', params],
    queryFn: () => getTournois(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const tournois = data?.results ?? []
  const hasFilters = Object.values(filters).some(Boolean)

  const set = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }))
    setPage(1)
  }

  return (
    <>
      <section className="hero">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`hero-bg ${i === heroIdx ? 'visible' : ''}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className="wrap hero-inner">
          <div>
            <span className="kicker">Abidjan · Côte d'Ivoire</span>
            <h1>
              Le sport de rue<br /><span className="o">ivoirien</span> a sa maison
            </h1>
            <p>Basket & football : trouve les tournois, prouve ton talent, fais-toi recruter.</p>
            <div className="cta-row">
              <button className="btn" onClick={() => document.getElementById('tournois')?.scrollIntoView({ behavior: 'smooth' })}>
                <span>Voir les tournois</span>
              </button>
              {!user && (
                <button className="btn ghost" onClick={() => navigate('/register')}>
                  <span>Rejoindre</span>
                </button>
              )}
            </div>
          </div>
          <img className="hero-logo" src="/logo.png" alt="Logo HoopCI" />
        </div>
      </section>

      {user?.role === 'joueur' && <RecommandesSection />}

      <div className="wrap" id="tournois">
        <h2 className="section-title">Tournois</h2>

        <div className="filters">
          <input
            className="chip"
            placeholder="Rechercher…"
            value={filters.search}
            onChange={set('search')}
            aria-label="Rechercher un tournoi"
          />
          {/* Filtre sport : change aussi la liste des formats proposés */}
          <select
            className={`chip ${filters.sport ? 'active' : ''}`}
            value={filters.sport}
            onChange={(e) => { setFilters((f) => ({ ...f, sport: e.target.value, format: '' })); setPage(1) }}
          >
            <option value="">Sport</option>
            {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={`chip ${filters.commune ? 'active' : ''}`} value={filters.commune} onChange={set('commune')}>
            <option value="">Commune</option>
            {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={`chip ${filters.format ? 'active' : ''}`} value={filters.format} onChange={set('format')}>
            <option value="">Format</option>
            {/* Formats du sport sélectionné, ou tous les formats si aucun sport choisi */}
            {(filters.sport ? FORMATS_PAR_SPORT[filters.sport] : FORMATS).map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f] || f}</option>
            ))}
          </select>
          <select className={`chip ${filters.niveau ? 'active' : ''}`} value={filters.niveau} onChange={set('niveau')}>
            <option value="">Niveau</option>
            {Object.entries(NIVEAUX).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={`chip ${filters.categorie_age ? 'active' : ''}`} value={filters.categorie_age} onChange={set('categorie_age')}>
            <option value="">Catégorie d'âge</option>
            {Object.entries(CATEGORIES_AGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={`chip ${filters.statut ? 'active' : ''}`} value={filters.statut} onChange={set('statut')}>
            <option value="">Statut</option>
            {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {hasFilters && (
            <button className="chip active" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}>
              <X size={13} style={{ verticalAlign: '-2px' }} /> Effacer
            </button>
          )}
          <button className="chip" onClick={() => navigate('/palmares')}>
            Palmarès
          </button>
        </div>

        {isLoading && <Spinner />}
        {isError && <Empty icon={<TriangleAlert size={44} />}>Impossible de charger les tournois. Vérifie ta connexion.</Empty>}
        {!isLoading && !isError && tournois.length === 0 && (
          <Empty>
            Aucun tournoi ne correspond {hasFilters ? 'à ces filtres' : 'pour le moment'}.
            {hasFilters && <><br />Essaie une autre commune.</>}
          </Empty>
        )}

        <div className="grid">
          {tournois.map((t) => <TournoiCard key={t.id} tournoi={t} />)}
        </div>

        {(data?.next || data?.previous) && (
          <div className="center mt" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn sm dark" disabled={!data?.previous} onClick={() => setPage((p) => p - 1)}>
              <span>← Précédent</span>
            </button>
            <button className="btn sm dark" disabled={!data?.next} onClick={() => setPage((p) => p + 1)}>
              <span>Suivant →</span>
            </button>
          </div>
        )}

        <h2 className="section-title mt">Ils nous font confiance</h2>
        <div className="sponsors">
          <div className="sponsor"><span>Votre marque ici</span></div>
          <div className="sponsor"><span>Sponsor fintech</span></div>
          <div className="sponsor"><span>Sponsor télécom</span></div>
          <div className="sponsor"><span>Équipementier</span></div>
        </div>
      </div>
      <Footer />
    </>
  )
}

/** Tournois choisis pour le joueur connecté selon son grade, ses performances et ses habitudes. */
function RecommandesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['tournois-recommandes'],
    queryFn: () => getTournoisRecommandes().then((r) => r.data),
  })

  if (isLoading || !data?.length) return null

  return (
    <div className="wrap">
      <h2 className="section-title">
        <Sparkles size={20} style={{ color: 'var(--orange)' }} /> Recommandés pour toi
      </h2>
      <p className="muted" style={{ fontSize: 12.5, marginTop: -6, marginBottom: 14 }}>
        Sélection automatique selon ton grade, tes performances et tes tournois habituels.
      </p>
      <div className="grid">
        {data.slice(0, 3).map((t) => (
          <div key={t.id}>
            <TournoiCard tournoi={t} />
            {t.raisons?.length > 0 && (
              <div className="raisons">
                {t.raisons.map((r) => <span key={r} className="raison-chip">{r}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
