import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Star } from 'lucide-react'
import { Avatar } from '../ui/bits.jsx'
import GradeBadge from './GradeBadge.jsx'
import { POSTES } from '../../lib/constants.js'

/**
 * Carte joueur — accepte soit un profil public (annuaire /players/),
 * soit une carte de transfert (marché /market/cartes/) via `carte`.
 */
export default function PlayerCard({ joueur, carte }) {
  const navigate = useNavigate()
  const j = joueur
  const boost = carte?.mise_en_avant_active

  return (
    <article
      className={`p-card ${boost ? 'boost' : ''}`}
      onClick={() => navigate(`/joueurs/${j.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/joueurs/${j.id}`)}
    >
      {boost && <span className="boost-tag"><Star size={10} style={{ verticalAlign: '-1px' }} /> En avant</span>}
      <Avatar photo={j.photo} nom={j.nom_complet} className={j.taux_victoire >= 50 ? '' : 'grn'} />
      <div className="p-main">
        <div className="p-name">
          {j.nom_complet}
          {(j.badge_verifie || carte?.badge_verifie) && (
            <BadgeCheck size={16} className="vbadge" aria-label="Profil vérifié" />
          )}
          <GradeBadge grade={j.grade} />
        </div>
        <div className="p-sub">
          {/* Sport + poste + commune (+ taille si renseignée) */}
          {j.sport === 'football' ? 'Football' : 'Basket'} · {POSTES[j.poste] || 'Poste non renseigné'} · {j.commune || 'Abidjan'}
          {j.taille ? ` · ${j.taille} cm` : ''}
        </div>
        <div className="winbar">
          <span>{j.tournois_joues} tournoi{j.tournois_joues > 1 ? 's' : ''}</span>
          <div className="bar"><i style={{ width: `${Math.min(j.taux_victoire, 100)}%` }} /></div>
          <b>{Math.round(j.taux_victoire)}%</b>
        </div>
        {carte?.description && (
          <p className="muted" style={{ fontSize: 12.5, marginTop: 7 }}>
            {carte.description.length > 90 ? carte.description.slice(0, 90) + '…' : carte.description}
          </p>
        )}
      </div>
    </article>
  )
}
