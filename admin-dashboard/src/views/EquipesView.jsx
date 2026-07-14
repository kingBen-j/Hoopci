import { useState } from 'react'
import { Star, Trash2, CircleCheck } from 'lucide-react'
import api, { apiError } from '../api.js'
import { usePagine, Pagination, Spinner, Erreur, Pill, fmtDate } from '../ui.jsx'

/** Gestion des équipes : inscriptions (payee), promotions offertes, suppression. */
export default function EquipesView() {
  const [recherche, setRecherche] = useState('')
  const [payee, setPayee] = useState('')
  const [message, setMessage] = useState('')
  const filtres = {}
  if (recherche) filtres.search = recherche
  if (payee) filtres.payee = payee

  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } = usePagine('/admin/equipes/', filtres)

  const agir = async (fn) => {
    setMessage('')
    try { await fn(); refresh() } catch (e) { setMessage(apiError(e)) }
  }

  return (
    <>
      <p className="section-note">
        « Valider » régularise une inscription non payée (geste commercial), l'étoile offre une promotion.
        L'effectif doit atteindre le minimum du format pour que les joueurs gagnent tous leurs points.
      </p>
      <div className="filtres">
        <input placeholder="Rechercher (équipe, tournoi)…" value={recherche} onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
        <select value={payee} onChange={(e) => setPayee(e.target.value)}>
          <option value="">Payées et non payées</option>
          <option value="true">Inscription payée</option>
          <option value="false">En attente de paiement</option>
        </select>
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Équipe</th><th>Effectif</th><th>Inscription</th><th>Promue</th><th>Créée</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((eq) => (
                <tr key={eq.id}>
                  <td>{eq.nom}<span className="sous">{eq.tournoi_titre}</span></td>
                  <td>
                    {eq.effectif}/{eq.effectif_min || '—'}
                    {eq.effectif_min > 0 && eq.effectif < eq.effectif_min && (
                      <span className="sous">incomplet — points réduits</span>
                    )}
                  </td>
                  <td>
                    {eq.payee ? <Pill tone="ok">Payée</Pill> : (
                      <button className="btn ghost" onClick={() => agir(() => api.patch(`/admin/equipes/${eq.id}/`, { payee: true }))}>
                        <CircleCheck size={13} /> Valider
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      className={eq.mise_en_avant ? 'btn' : 'btn ghost'}
                      title={eq.mise_en_avant ? 'Retirer la promotion' : 'Promouvoir gratuitement'}
                      onClick={() => agir(() => api.patch(`/admin/equipes/${eq.id}/`, { mise_en_avant: !eq.mise_en_avant }))}
                    >
                      <Star size={13} /> {eq.mise_en_avant ? 'Promue' : 'Non'}
                    </button>
                  </td>
                  <td>{fmtDate(eq.created_at)}</td>
                  <td>
                    <button
                      className="btn danger"
                      onClick={() => window.confirm(`Supprimer l'équipe « ${eq.nom} » ?`)
                        && agir(() => api.delete(`/admin/equipes/${eq.id}/`))}
                    >
                      <Trash2 size={13} />
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
