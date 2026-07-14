import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import api, { apiError } from '../api.js'
import {
  usePagine, Pagination, Spinner, Erreur,
  fcfa, fmtDate, STATUTS_EVENEMENT, TYPES_EVENEMENT,
} from '../ui.jsx'

/** Gestion des événements : statut, suppression. */
export default function EvenementsView() {
  const [recherche, setRecherche] = useState('')
  const [statut, setStatut] = useState('')
  const [message, setMessage] = useState('')
  const filtres = {}
  if (recherche) filtres.search = recherche
  if (statut) filtres.statut = statut

  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } = usePagine('/admin/evenements/', filtres)

  const agir = async (fn) => {
    setMessage('')
    try { await fn(); refresh() } catch (e) { setMessage(apiError(e)) }
  }

  return (
    <>
      <div className="filtres">
        <input placeholder="Rechercher (titre, commune, e-mail)…" value={recherche} onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
        <select value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_EVENEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Événement</th><th>Publié par</th><th>Date</th><th>Entrée</th><th>Intéressés</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((ev) => (
                <tr key={ev.id}>
                  {/* Sous-ligne : type d'événement · sport · commune */}
                  <td>{ev.titre}<span className="sous">{TYPES_EVENEMENT[ev.type_evenement] || ev.type_evenement} · {ev.sport === 'football' ? 'Football' : 'Basket'} · {ev.commune}</span></td>
                  <td>{ev.organisateur_nom}<span className="sous">{ev.organisateur_email}</span></td>
                  <td>{fmtDate(ev.date_debut)}</td>
                  <td>{Number(ev.prix_entree) > 0 ? fcfa(ev.prix_entree) : 'Gratuit'}</td>
                  <td>{ev.nb_interesses}</td>
                  <td>
                    <select value={ev.statut} onChange={(e) => agir(() => api.patch(`/admin/evenements/${ev.id}/`, { statut: e.target.value }))}>
                      {Object.entries(STATUTS_EVENEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn danger"
                      onClick={() => window.confirm(`Supprimer définitivement « ${ev.titre} » ?`)
                        && agir(() => api.delete(`/admin/evenements/${ev.id}/`))}
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
