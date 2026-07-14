import { Volleyball } from 'lucide-react'
import { STATUTS, STATUTS_PRIVES, OFFRE_STATUTS, initials } from '../../lib/constants.js'

export function StatusBadge({ statut }) {
  const label = STATUTS[statut] || STATUTS_PRIVES[statut] || OFFRE_STATUTS[statut] || statut
  return (
    <span className={`status st-${statut}`}>
      <span>{label}</span>
    </span>
  )
}

export function Spinner() {
  return <div className="spinner" aria-label="Chargement" />
}

export function Empty({ icon, children }) {
  return (
    <div className="empty">
      <span className="big-ic">{icon ?? <Volleyball size={44} />}</span>
      {children}
    </div>
  )
}

export function Avatar({ photo, nom, className = '' }) {
  return (
    <div className={`avatar ${className}`}>
      {photo ? <img src={photo} alt={nom} loading="lazy" /> : initials(nom)}
    </div>
  )
}
