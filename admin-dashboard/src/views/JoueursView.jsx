import { useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import api, { apiError } from '../api.js'
import { usePagine, Pagination, Spinner, Erreur, Pill, GRADES } from '../ui.jsx'

const TONE_GRADE = { bronze: 'neutre', argent: 'neutre', or: 'warn', platine: 'ok', legende: 'ok' }

/** Grades et statistiques des joueurs (lecture + recalcul forcé). */
export default function JoueursView() {
  const [recherche, setRecherche] = useState('')
  const [grade, setGrade] = useState('')
  const [message, setMessage] = useState('')
  const filtres = {}
  if (recherche) filtres.search = recherche
  if (grade) filtres.grade = grade

  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } = usePagine('/admin/joueurs/', filtres)

  const recalculer = async (profil) => {
    setMessage('')
    try { await api.post(`/admin/joueurs/${profil.id}/recalculer/`); refresh() } catch (e) { setMessage(apiError(e)) }
  }

  return (
    <>
      <p className="section-note">
        Points et grades calculés automatiquement d'après les résultats officiels —
        « Recalculer » force une mise à jour (après modération d'un résultat par exemple).
      </p>
      <div className="filtres">
        <input placeholder="Rechercher (nom, e-mail)…" value={recherche} onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">Tous les grades</option>
          {Object.entries(GRADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Joueur</th><th>Sport</th><th>Joués</th><th>Gagnés</th><th>MVP</th><th>Points</th><th>Grade</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id}>
                  <td>{j.joueur_nom}<span className="sous">{j.joueur_email}</span></td>
                  <td>{j.sport === 'football' ? 'Football' : 'Basket'}{j.poste ? ` · ${j.poste}` : ''}</td>
                  <td>{j.tournois_joues}</td>
                  <td>{j.tournois_gagnes}</td>
                  <td>{j.mvp_count}</td>
                  <td><b>{j.points}</b></td>
                  <td><Pill tone={TONE_GRADE[j.grade] || 'neutre'}>{GRADES[j.grade] || j.grade}</Pill></td>
                  <td>
                    <button className="btn ghost" onClick={() => recalculer(j)} title="Recalculer stats et grade">
                      <RefreshCcw size={13} /> Recalculer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} setPage={setPage} hasNext={hasNext} hasPrev={hasPrev} />
    </>
  )
}
