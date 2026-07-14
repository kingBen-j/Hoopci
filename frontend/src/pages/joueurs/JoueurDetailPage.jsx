import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, Mail, Medal, ShieldAlert, TriangleAlert } from 'lucide-react'
import { getJoueur } from '../../api/players.js'
import { envoyerOffre } from '../../api/market.js'
import { Spinner, Empty, Avatar } from '../../components/ui/bits.jsx'
import GradeBadge, { GradeProgress } from '../../components/joueurs/GradeBadge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { POSTES, GRADES, BAREME_POINTS, apiError } from '../../lib/constants.js'

export default function JoueurDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthStore()
  const [showOffre, setShowOffre] = useState(false)
  const [message, setMessage] = useState('')

  const { data: j, isLoading, isError } = useQuery({
    queryKey: ['joueur', id],
    queryFn: () => getJoueur(id).then((r) => r.data),
  })

  const offreMutation = useMutation({
    mutationFn: () => envoyerOffre(Number(id), message.trim()),
    onSuccess: () => {
      setShowOffre(false)
      setMessage('')
      toast('Offre envoyée au joueur !')
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  if (isLoading) return <Spinner />
  if (isError || !j) return <Empty icon={<TriangleAlert size={44} />}>Joueur introuvable.</Empty>

  const estMoi = user?.id === j.id
  const estMineurMasque = j.nom_complet === 'Joueur mineur'

  return (
    <>
      <div className="profile-head">
        <div className="wrap">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft size={18} />
          </button>
          <div className="profile-head-inner">
            <Avatar photo={j.photo} nom={j.nom_complet} className="lg" />
            <div>
              <div className="p-name" style={{ fontSize: 26 }}>
                {j.nom_complet}
                {j.badge_verifie && <BadgeCheck size={19} className="vbadge" aria-label="Profil vérifié" />}
                <GradeBadge grade={j.grade} size="lg" />
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {/* Sport + poste + commune (+ taille si renseignée) */}
                {j.sport === 'football' ? 'Football' : 'Basketball'} · {POSTES[j.poste] || 'Poste non renseigné'} · {j.commune || 'Abidjan'}
                {j.taille ? ` · ${j.taille} cm` : ''}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {j.mvp_count > 0 && (
                  <span className="dispo-pill orange">
                    <Medal size={11} style={{ verticalAlign: '-2px' }} /> {j.mvp_count}× MVP
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        {estMineurMasque && (
          <div className="alert mt">
            <ShieldAlert size={14} style={{ verticalAlign: '-2px' }} /> Profil de joueur mineur : l'identité complète et la photo sont masquées.
            Connectez-vous pour plus d'informations — toute mise en relation passe par son tuteur.
          </div>
        )}

        <div className="stats-row">
          <div className="stat"><b>{j.tournois_joues}</b><span>Joués</span></div>
          <div className="stat"><b>{j.tournois_gagnes}</b><span>Gagnés</span></div>
          <div className="stat"><b>{Math.round(j.taux_victoire)}%</b><span>Victoires</span></div>
          <div className="stat"><b>{j.mvp_count}</b><span>MVP</span></div>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginBottom: 16 }}>
          Statistiques calculées automatiquement à partir des résultats saisis par les promoteurs.
        </p>

        <div className="panel">
          <h3>Grade <GradeBadge grade={j.grade} /></h3>
          <GradeProgress joueur={j} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(GRADES).map(([k, g]) => (
              <span key={k} className={`grade-badge gr-${k}`} style={{ opacity: k === j.grade ? 1 : 0.45 }}>
                <span>{g.label} · {g.min}+ pts</span>
              </span>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
            Points gagnés automatiquement : {BAREME_POINTS.map((b) => `${b.points} pts ${b.label}`).join(' · ')}.
          </p>
        </div>

        {j.bio && (
          <div className="panel">
            <h3>À propos</h3>
            <p className="txt-soft" style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{j.bio}</p>
          </div>
        )}

        {!estMoi && (
          <div style={{ maxWidth: 420 }}>
            <button
              className="btn block green"
              onClick={() => (user ? setShowOffre(true) : navigate('/login'))}
            >
              <span><Mail size={16} /> Envoyer une offre</span>
            </button>
            <p className="muted center" style={{ fontSize: 11.5, marginTop: 8 }}>
              Offre privée. HoopCI met en relation mais n'est pas partie à l'accord conclu.
            </p>
          </div>
        )}
      </div>

      {showOffre && (
        <Modal title={`Offre pour ${j.nom_complet}`} onClose={() => setShowOffre(false)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              if (message.trim()) offreMutation.mutate()
            }}
          >
            <div className="field">
              <label>Votre message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Présentez votre équipe, le contexte, ce que vous proposez (défraiement, prime…)"
                rows={5}
                autoFocus
                required
              />
            </div>
            <button className="btn block green" type="submit" disabled={offreMutation.isPending}>
              <span>{offreMutation.isPending ? 'Envoi…' : 'Envoyer l’offre'}</span>
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
