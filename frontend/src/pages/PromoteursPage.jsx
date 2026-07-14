import { useQuery } from '@tanstack/react-query'
import { Trophy, TriangleAlert, Megaphone, CalendarRange, Users } from 'lucide-react'
import { getClassementPromoteurs } from '../api/events.js'
import { Spinner, Empty, Avatar } from '../components/ui/bits.jsx'
import GradeBadge from '../components/joueurs/GradeBadge.jsx'
import { unwrap } from '../lib/constants.js'

export default function PromoteursPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['classement-promoteurs'],
    queryFn: () => getClassementPromoteurs().then((r) => r.data),
  })

  const items = unwrap(data)
  const podium = items.slice(0, 3)
  const reste = items.slice(3)

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <span className="kicker">Hall of fame</span>
      <h1 style={{ fontSize: 32, marginTop: 10 }}>
        Top <span style={{ color: 'var(--orange)' }}>promoteurs</span>
      </h1>
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 14px' }}>
        Classés selon leur activité réelle : tournois organisés et terminés, événements publiés,
        équipes attirées et public intéressé.
      </p>

      {isLoading && <Spinner />}
      {isError && <Empty icon={<TriangleAlert size={44} />}>Impossible de charger le classement.</Empty>}
      {!isLoading && !isError && items.length === 0 && (
        <Empty icon={<Megaphone size={44} />}>Aucun promoteur pour le moment.</Empty>
      )}

      {podium.length > 0 && (
        <div className="podium">
          {podium.map((o, i) => (
            <div key={o.id} className={`podium-card pod-${i + 1}`}>
              <span className="podium-rank"><Trophy size={13} style={{ verticalAlign: '-2px' }} /> #{i + 1}</span>
              <Avatar photo={o.photo} nom={o.nom_complet} className={i === 0 ? 'lg' : ''} />
              <b className="podium-name">{o.nom_complet}</b>
              {/* Grade promoteur : évolue avec l'audience de ses tournois */}
              <GradeBadge grade={o.grade} />
              <span className="dispo-pill">Promoteur</span>
              <span className="podium-score">{o.score} pts</span>
              <span className="muted" style={{ fontSize: 11 }}>
                {o.nb_tournois} tournoi{o.nb_tournois > 1 ? 's' : ''} · {o.nb_evenements} événement{o.nb_evenements > 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {reste.length > 0 && (
        <div className="panel mt">
          {reste.map((o, i) => (
            <div key={o.id} className="rank-row">
              <span className="rank-num"><span>{i + 4}</span></span>
              <Avatar photo={o.photo} nom={o.nom_complet} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontFamily: 'var(--cond)', fontStyle: 'italic', textTransform: 'uppercase', fontSize: 16 }}>
                  {o.nom_complet} <GradeBadge grade={o.grade} />
                </b>
                <p className="muted" style={{ fontSize: 11.5 }}>
                  Promoteur{o.commune ? ` · ${o.commune}` : ''}
                </p>
              </div>
              <div className="muted" style={{ fontSize: 11.5, textAlign: 'right' }}>
                <span style={{ marginRight: 10 }}><CalendarRange size={12} style={{ verticalAlign: '-2px' }} /> {o.nb_tournois + o.nb_evenements}</span>
                <span><Users size={12} style={{ verticalAlign: '-2px' }} /> {o.nb_equipes}</span>
                <b style={{ display: 'block', color: 'var(--orange)', fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 17 }}>
                  {o.score} pts
                </b>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: 11.5, margin: '14px 0' }}>
        Score = tournois terminés ×25 · tournois publiés ×10 · événements ×15 · équipes attirées ×5 · intéressés ×2.
        <br />
        Grade promoteur = audience des tournois : équipes inscrites ×5 · joueurs participants ×2 · favoris ×1
        (Argent 50+ · Or 150+ · Platine 400+ · Légende 1000+).
      </p>
    </div>
  )
}
