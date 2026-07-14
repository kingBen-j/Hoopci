import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal, MapPin, Calendar, TriangleAlert, X, Shield } from 'lucide-react'
import { getPalmares, getClassementEquipes } from '../../api/tournaments.js'
import { Spinner, Empty } from '../../components/ui/bits.jsx'
import { COMMUNES, NIVEAUX, FORMAT_LABELS, fmtDateRange, unwrap } from '../../lib/constants.js'

/** Récap public : résultats des tournois terminés + classement des équipes. */
export default function PalmaresPage() {
  // /palmares#equipes ouvre directement le classement des équipes
  const [tab, setTab] = useState(() => (window.location.hash === '#equipes' ? 'equipes' : 'resultats'))
  const [commune, setCommune] = useState('')
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['palmares', commune],
    queryFn: () => getPalmares(commune ? { commune } : undefined).then((r) => r.data),
    enabled: tab === 'resultats',
  })

  const items = unwrap(data)

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <span className="kicker">Histoire du bitume</span>
      <h1 style={{ fontSize: 32, marginTop: 10 }}>
        Palma<span style={{ color: 'var(--orange)' }}>rès</span>
      </h1>
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 14px' }}>
        Les vainqueurs, scores de finale et MVP de chaque tournoi — et le classement des équipes.
      </p>

      <div className="tabs">
        <button className={tab === 'resultats' ? 'active' : ''} onClick={() => setTab('resultats')}>
          Résultats
        </button>
        <button className={tab === 'equipes' ? 'active' : ''} onClick={() => setTab('equipes')}>
          Classement des équipes
        </button>
      </div>

      {tab === 'equipes' && <ClassementEquipes />}

      {tab === 'resultats' && (
      <>
      <div className="filters">
        <select className={`chip ${commune ? 'active' : ''}`} value={commune} onChange={(e) => setCommune(e.target.value)}>
          <option value="">Toutes les communes</option>
          {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {commune && (
          <button className="chip active" onClick={() => setCommune('')}>
            <X size={13} style={{ verticalAlign: '-2px' }} /> Effacer
          </button>
        )}
      </div>

      {isLoading && <Spinner />}
      {isError && <Empty icon={<TriangleAlert size={44} />}>Impossible de charger le palmarès.</Empty>}
      {!isLoading && !isError && items.length === 0 && (
        <Empty icon={<Trophy size={44} />}>Aucun tournoi terminé {commune ? `à ${commune}` : ''} pour le moment.</Empty>
      )}

      <div className="grid two">
        {items.map((t) => {
          const r = t.resultat || {}
          const aScore = r.score_gagnante != null && r.score_finaliste != null
          return (
            <article
              key={t.id}
              className="t-card"
              onClick={() => navigate(`/tournois/${t.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/tournois/${t.id}`)}
            >
              <div className="t-body">
                <div className="o-head">
                  <b>{t.titre}</b>
                  {/* Sport + format lisible */}
                  <span className="fmt">{t.sport === 'football' ? 'Football' : 'Basket'} · {FORMAT_LABELS[t.format] || t.format}</span>
                </div>
                <div className="t-meta">
                  <span><MapPin size={13} style={{ verticalAlign: '-2px' }} /> <b>{t.commune}</b></span>
                  <span><Calendar size={13} style={{ verticalAlign: '-2px' }} /> <b>{fmtDateRange(t.date_debut, t.date_fin)}</b></span>
                  <span>{NIVEAUX[t.niveau] || t.niveau}</span>
                </div>

                <div className="finale-box">
                  <div className="finale-team win">
                    <Trophy size={15} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                    <b>{r.equipe_gagnante_nom || 'Vainqueur inconnu'}</b>
                    {aScore && <span className="score-finale">{r.score_gagnante}</span>}
                  </div>
                  {r.equipe_finaliste_nom && (
                    <div className="finale-team">
                      <span className="muted" style={{ width: 15, textAlign: 'center', flexShrink: 0 }}>2</span>
                      <b className="muted">{r.equipe_finaliste_nom}</b>
                      {aScore && <span className="score-finale muted">{r.score_finaliste}</span>}
                    </div>
                  )}
                </div>

                {r.mvp_nom && (
                  <div className="t-foot" style={{ borderTop: 'none', paddingTop: 0 }}>
                    <span className="dispo-pill orange">
                      <Medal size={11} style={{ verticalAlign: '-2px' }} /> MVP : {r.mvp_nom}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>par {t.organisateur_nom}</span>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
      </>
      )}
    </div>
  )
}

/** Classement des équipes — victoires ×30 · finales ×15 · participations ×5. */
function ClassementEquipes() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['classement-equipes'],
    queryFn: () => getClassementEquipes().then((r) => r.data),
  })

  if (isLoading) return <Spinner />
  if (isError) return <Empty icon={<TriangleAlert size={44} />}>Impossible de charger le classement.</Empty>
  if (!data?.length) return <Empty icon={<Shield size={44} />}>Aucune équipe classée pour le moment.</Empty>

  return (
    <>
      <div className="panel">
        {data.map((e, i) => (
          <div key={e.nom} className={`rank-row ${i === 0 ? 'rank-1' : ''}`}>
            <span className="rank-num"><span>{i + 1}</span></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontFamily: 'var(--cond)', fontStyle: 'italic', textTransform: 'uppercase', fontSize: 17 }}>
                {e.nom} {i === 0 && <Trophy size={14} style={{ color: 'var(--yellow)', verticalAlign: '-2px' }} />}
              </b>
              <p className="muted" style={{ fontSize: 11.5 }}>
                {e.victoires} victoire{e.victoires > 1 ? 's' : ''} · {e.finales_perdues} finale{e.finales_perdues > 1 ? 's' : ''} ·
                {' '}{e.tournois_joues} tournoi{e.tournois_joues > 1 ? 's' : ''} joué{e.tournois_joues > 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ color: 'var(--green)', fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 15 }}>
                {Math.round(e.taux_victoire)}%
              </b>
              <b style={{ display: 'block', color: 'var(--orange)', fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 18 }}>
                {e.points} pts
              </b>
            </div>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 11.5, margin: '12px 0' }}>
        Points : victoire ×30 · finale perdue ×15 · participation ×5 — % = taux de victoire sur les tournois à résultat officiel.
        Les équipes sont regroupées par nom, tous tournois confondus.
      </p>
    </>
  )
}
