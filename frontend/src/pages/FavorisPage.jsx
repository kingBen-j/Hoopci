import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { getFavoris } from '../api/tournaments.js'
import TournoiCard from '../components/tournois/TournoiCard.jsx'
import { Spinner, Empty } from '../components/ui/bits.jsx'
import { unwrap } from '../lib/constants.js'

export default function FavorisPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['favoris'],
    queryFn: () => getFavoris().then((r) => unwrap(r.data)),
  })

  const tournois = data ?? []

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <h1 style={{ fontSize: 32 }}>Mes <span style={{ color: 'var(--orange)' }}>favoris</span></h1>
      <p className="muted mb" style={{ fontSize: 13 }}>Les tournois que tu suis.</p>

      {isLoading && <Spinner />}
      {!isLoading && tournois.length === 0 && (
        <Empty icon={<Star size={44} />}>
          Aucun tournoi en favori.
          <br />
          <Link to="/" className="btn sm mt" style={{ display: 'inline-flex' }}>
            <span>Parcourir les tournois</span>
          </Link>
        </Empty>
      )}

      <div className="grid">
        {tournois.map((t) => <TournoiCard key={t.id} tournoi={t} />)}
      </div>
    </div>
  )
}
