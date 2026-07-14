import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Star } from 'lucide-react'
import { StatusBadge } from '../ui/bits.jsx'
import { TYPES_EVENEMENT, ROLES, fcfa, fmtDateRange, gradFor } from '../../lib/constants.js'

/** Carte événement de l'agenda — cliquable au clavier, mène à la fiche. */
export default function EvenementCard({ evenement }) {
  const navigate = useNavigate()
  const e = evenement
  const hasImg = Boolean(e.affiche)

  return (
    <article
      className="t-card"
      onClick={() => navigate(`/evenements/${e.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/evenements/${e.id}`)}
    >
      <div
        className={`t-cover ${hasImg ? 'has-img' : gradFor(e.id)}`}
        style={hasImg ? { backgroundImage: `url(${e.affiche})` } : undefined}
      >
        {!hasImg && <span className="big">Event</span>}
        <h3>{e.titre}</h3>
      </div>
      <div className="t-body">
        <div className="badge-row">
          <StatusBadge statut={e.statut} />
          {/* Sport + type d'événement (exhibition, camp, dunk contest…) */}
          <span className="fmt">{e.sport === 'football' ? 'Football' : 'Basket'} · {TYPES_EVENEMENT[e.type_evenement] || e.type_evenement}</span>
        </div>
        <div className="t-meta">
          <span><MapPin size={13} style={{ verticalAlign: '-2px' }} /> <b>{e.commune}</b></span>
          <span><Calendar size={13} style={{ verticalAlign: '-2px' }} /> <b>{fmtDateRange(e.date_debut, e.date_fin)}</b></span>
          {e.nb_interesses > 0 && (
            <span><Star size={13} style={{ verticalAlign: '-2px' }} /> <b>{e.nb_interesses}</b> intéressé{e.nb_interesses > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="t-foot">
          <span className="price">
            {fcfa(e.prix_entree)} {Number(e.prix_entree) > 0 && <small>/ entrée</small>}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            par {e.organisateur_nom} · {ROLES[e.organisateur_role] || e.organisateur_role}
          </span>
        </div>
      </div>
    </article>
  )
}
