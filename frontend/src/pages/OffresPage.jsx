import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Mail, Handshake } from 'lucide-react'
import { getOffres, repondreOffre } from '../api/market.js'
import { StatusBadge, Spinner, Empty } from '../components/ui/bits.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuthStore } from '../store/authStore.js'
import { fmtDate, apiError, unwrap } from '../lib/constants.js'

export default function OffresPage() {
  const [tab, setTab] = useState('recues')
  const { user } = useAuthStore()
  const toast = useToast()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['offres'],
    queryFn: () => getOffres().then((r) => unwrap(r.data)),
  })

  const reponseMutation = useMutation({
    mutationFn: ({ id, statut }) => repondreOffre(id, statut),
    onSuccess: (_, { statut }) => {
      qc.invalidateQueries({ queryKey: ['offres'] })
      toast(statut === 'acceptee' ? 'Offre acceptée !' : 'Offre refusée', statut === 'acceptee' ? 'success' : 'info')
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  const offres = data ?? []
  const recues = offres.filter((o) => o.joueur === user?.id)
  const envoyees = offres.filter((o) => o.emetteur === user?.id)
  const list = tab === 'recues' ? recues : envoyees

  return (
    <div className="wrap" style={{ paddingTop: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 32 }}>Mes <span style={{ color: 'var(--orange)' }}>offres</span></h1>

      <div className="tabs mt">
        <button className={tab === 'recues' ? 'active' : ''} onClick={() => setTab('recues')}>
          Reçues ({recues.length})
        </button>
        <button className={tab === 'envoyees' ? 'active' : ''} onClick={() => setTab('envoyees')}>
          Envoyées ({envoyees.length})
        </button>
      </div>

      {isLoading && <Spinner />}
      {!isLoading && list.length === 0 && (
        <Empty icon={<Mail size={44} />}>
          Aucune offre {tab === 'recues' ? 'reçue' : 'envoyée'} pour l'instant.
          {tab === 'envoyees' && (
            <><br /><Link to="/joueurs" className="btn sm green mt" style={{ display: 'inline-flex' }}>
              <span>Parcourir les joueurs</span>
            </Link></>
          )}
        </Empty>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((o) => (
          <div className="o-card" key={o.id}>
            <div className="o-head">
              <b>
                {tab === 'recues'
                  ? <>De : {o.emetteur_nom}</>
                  : <>À : <Link to={`/joueurs/${o.joueur}`} style={{ color: 'var(--green)' }}>{o.joueur_nom}</Link></>}
              </b>
              <StatusBadge statut={o.statut} />
            </div>
            <p className="o-msg">{o.message}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <time className="muted" style={{ fontSize: 11.5 }}>{fmtDate(o.created_at)}</time>
              {tab === 'recues' && o.statut === 'en_attente' && (
                <div className="o-actions">
                  <button
                    className="btn sm red"
                    disabled={reponseMutation.isPending}
                    onClick={() => reponseMutation.mutate({ id: o.id, statut: 'refusee' })}
                  >
                    <span>Refuser</span>
                  </button>
                  <button
                    className="btn sm green"
                    disabled={reponseMutation.isPending}
                    onClick={() => reponseMutation.mutate({ id: o.id, statut: 'acceptee' })}
                  >
                    <span>Accepter</span>
                  </button>
                </div>
              )}
              {o.statut === 'acceptee' && (
                <span className="muted" style={{ fontSize: 11.5 }}>
                  <Handshake size={13} style={{ verticalAlign: '-2px' }} /> Mise en relation conclue
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
