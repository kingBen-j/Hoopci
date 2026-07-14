import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Phone, Star, TriangleAlert } from 'lucide-react'
import { getEvenement, toggleInteresse, updateEvenement } from '../../api/events.js'
import { Spinner, Empty, StatusBadge, Avatar } from '../../components/ui/bits.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useAuthStore } from '../../store/authStore.js'
import {
  TYPES_EVENEMENT, STATUTS_EVENEMENT, ROLES,
  fcfa, fmtDateRange, gradFor, apiError,
} from '../../lib/constants.js'

export default function EvenementDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const { data: e, isLoading, isError } = useQuery({
    queryKey: ['evenement', id],
    queryFn: () => getEvenement(id).then((r) => r.data),
  })

  const interesseMutation = useMutation({
    mutationFn: () => toggleInteresse(id),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['evenement', id] })
      qc.invalidateQueries({ queryKey: ['evenements'] })
      toast(data.interesse ? 'Tu es sur la liste des intéressés !' : 'Intérêt retiré', 'info')
    },
    onError: (err) => toast(apiError(err), 'error'),
  })

  const statutMutation = useMutation({
    mutationFn: (statut) => updateEvenement(id, { statut }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evenement', id] })
      qc.invalidateQueries({ queryKey: ['evenements'] })
      toast('Statut mis à jour')
    },
    onError: (err) => toast(apiError(err), 'error'),
  })

  if (isLoading) return <Spinner />
  if (isError || !e) return <Empty icon={<TriangleAlert size={44} />}>Événement introuvable.</Empty>

  const hasImg = Boolean(e.affiche)
  const estProprio = user?.id === e.organisateur?.id
  const heure = e.heure ? e.heure.slice(0, 5).replace(':', 'h') : null

  return (
    <>
      <div
        className={`detail-cover ${hasImg ? 'has-img' : gradFor(e.id)}`}
        style={hasImg ? { backgroundImage: `url(${e.affiche})` } : undefined}
      >
        <div className="wrap">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft size={18} />
          </button>
          <div className="badge-row" style={{ marginBottom: 8 }}>
            <StatusBadge statut={e.statut} />
            {/* Sport + type d'événement */}
            <span className="fmt">{e.sport === 'football' ? 'Football' : 'Basket'} · {TYPES_EVENEMENT[e.type_evenement] || e.type_evenement}</span>
          </div>
          <h1>{e.titre}</h1>
          <p style={{ marginTop: 6, opacity: 0.9, fontSize: 14 }}>
            <MapPin size={14} style={{ verticalAlign: '-2px' }} /> {e.lieu} · {e.commune}
          </p>
        </div>
      </div>

      <div className="wrap">
        <div className="info-grid">
          <div className="info-tile"><div className="lbl">Dates</div><div className="val">{fmtDateRange(e.date_debut, e.date_fin)}</div></div>
          <div className="info-tile"><div className="lbl">Heure</div><div className="val">{heure || '—'}</div></div>
          <div className="info-tile"><div className="lbl">Entrée</div><div className="val">{fcfa(e.prix_entree)}</div></div>
          <div className="info-tile"><div className="lbl">Intéressés</div><div className="val">{e.nb_interesses}</div></div>
        </div>

        <div className="detail-layout">
          <div>
            {e.description && (
              <div className="panel">
                <h3>À propos</h3>
                <p className="txt-soft" style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{e.description}</p>
              </div>
            )}

            <div className="panel">
              <h3 className="green">Publié par</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar photo={e.organisateur?.photo} nom={e.organisateur?.nom_complet} />
                <div>
                  <b style={{ fontFamily: 'var(--cond)', fontStyle: 'italic', textTransform: 'uppercase', fontSize: 17 }}>
                    {e.organisateur?.nom_complet}
                  </b>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {ROLES[e.organisateur?.role] || e.organisateur?.role}
                    {e.organisateur?.commune ? ` · ${e.organisateur.commune}` : ''}
                  </p>
                </div>
              </div>
              {e.contact && (
                <p style={{ marginTop: 10, fontSize: 13.5 }}>
                  <Phone size={13} style={{ verticalAlign: '-2px' }} /> Contact : <b>{e.contact}</b>
                </p>
              )}
            </div>
          </div>

          <div>
            {!estProprio && e.statut !== 'annule' && e.statut !== 'termine' && (
              <div className="panel">
                <h3>Y aller ?</h3>
                <button
                  className={`btn block ${e.is_interesse ? 'dark' : 'green'}`}
                  onClick={() => (user ? interesseMutation.mutate() : navigate('/login'))}
                  disabled={interesseMutation.isPending}
                >
                  <span><Star size={16} /> {e.is_interesse ? 'Je ne suis plus intéressé' : 'Je suis intéressé'}</span>
                </button>
                <p className="muted center" style={{ fontSize: 11.5, marginTop: 8 }}>
                  {e.nb_interesses} personne{e.nb_interesses > 1 ? 's' : ''} intéressée{e.nb_interesses > 1 ? 's' : ''} par cet événement.
                </p>
              </div>
            )}

            {estProprio && (
              <div className="panel">
                <h3>Gérer mon événement</h3>
                <div className="field">
                  <label>Statut</label>
                  <select
                    value={e.statut}
                    onChange={(ev) => statutMutation.mutate(ev.target.value)}
                    disabled={statutMutation.isPending}
                  >
                    {Object.entries(STATUTS_EVENEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
