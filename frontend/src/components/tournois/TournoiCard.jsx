import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Users, Star } from 'lucide-react'
import { StatusBadge } from '../ui/bits.jsx'
import { NIVEAUX, FORMAT_LABELS, CATEGORIES_AGE, fcfa, fmtDateRange, gradFor } from '../../lib/constants.js'

/**
 * Carte tournoi affichée dans l'annuaire, les favoris et les recommandations.
 * Cliquable au clavier (Enter) — toute la carte mène à la fiche du tournoi.
 */
export default function TournoiCard({ tournoi }) {
  const navigate = useNavigate()
  const t = tournoi
  const hasImg = Boolean(t.affiche)

  return (
    <article
      className={`t-card ${t.mis_en_avant ? 'boost' : ''}`}
      onClick={() => navigate(`/tournois/${t.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/tournois/${t.id}`)}
    >
      {/* Badge « Promu » : tournoi mis en avant par un paiement GeniusPay */}
      {t.mis_en_avant && (
        <span className="boost-tag"><Star size={10} style={{ verticalAlign: '-1px' }} /> Promu</span>
      )}
      {/* Couverture : affiche uploadée, sinon dégradé de secours dérivé de l'id */}
      <div
        className={`t-cover ${hasImg ? 'has-img' : gradFor(t.id)}`}
        style={hasImg ? { backgroundImage: `url(${t.affiche})` } : undefined}
      >
        {!hasImg && <span className="big">{FORMAT_LABELS[t.format] || t.format}</span>}
        <h3>{t.titre}</h3>
      </div>
      <div className="t-body">
        <div className="badge-row">
          <StatusBadge statut={t.statut} />
          {/* Sport + format : Maracana, 3x3, 7 vs 7… */}
          <span className="fmt">{t.sport === 'football' ? 'Football' : 'Basket'} · {FORMAT_LABELS[t.format] || t.format}</span>
          <span className="muted" style={{ fontSize: 12 }}>{NIVEAUX[t.niveau] || t.niveau}</span>
          {t.categorie_age && t.categorie_age !== 'open' && (
            <span className="muted" style={{ fontSize: 12 }}>· {CATEGORIES_AGE[t.categorie_age] || t.categorie_age}</span>
          )}
        </div>
        <div className="t-meta">
          <span><MapPin size={13} style={{ verticalAlign: '-2px' }} /> <b>{t.commune}</b></span>
          <span><Calendar size={13} style={{ verticalAlign: '-2px' }} /> <b>{fmtDateRange(t.date_debut, t.date_fin)}</b></span>
          <span><Users size={13} style={{ verticalAlign: '-2px' }} /> <b>{t.nb_equipes ?? 0}</b> équipes</span>
        </div>
        <div className="t-foot">
          <span className="price">
            {fcfa(t.frais_inscription)} {Number(t.frais_inscription) > 0 && <small>/ équipe</small>}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>par {t.organisateur_nom}</span>
        </div>
      </div>
    </article>
  )
}
