import { GRADES } from '../../lib/constants.js'

/**
 * Badge de grade joueur (bronze → légende).
 * `size="lg"` pour les en-têtes de profil.
 */
export default function GradeBadge({ grade, size }) {
  if (!grade || !GRADES[grade]) return null
  return (
    <span className={`grade-badge gr-${grade} ${size === 'lg' ? 'lg' : ''}`}>
      <span>{GRADES[grade].label}</span>
    </span>
  )
}

/** Barre de progression vers le grade suivant. */
export function GradeProgress({ joueur }) {
  const j = joueur
  if (!j?.grade) return null
  if (!j.grade_suivant) {
    return (
      <p className="muted" style={{ fontSize: 12.5 }}>
        Grade maximal atteint — respect, légende du bitume.
      </p>
    )
  }
  const restants = Math.max((j.points_grade_suivant ?? 0) - (j.points ?? 0), 0)
  return (
    <div>
      <div className="winbar">
        <span>{j.points} pts</span>
        <div className="bar"><i className={`gr-fill-${j.grade_suivant}`} style={{ width: `${Math.min(j.progression_grade ?? 0, 100)}%` }} /></div>
        <b>{j.points_grade_suivant} pts</b>
      </div>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
        Plus que <b>{restants} points</b> pour passer <b>{GRADES[j.grade_suivant].label}</b>.
      </p>
    </div>
  )
}
