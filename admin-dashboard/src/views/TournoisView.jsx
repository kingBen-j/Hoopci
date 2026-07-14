import { useState } from 'react'
import { Star, Trash2 } from 'lucide-react'
import api, { apiError } from '../api.js'
import {
  usePagine, Pagination, Spinner, Erreur,
  fcfa, fmtDate, STATUTS_TOURNOI,
} from '../ui.jsx'

/** Gestion de tous les tournois : statut, promotion (offerte), suppression. */
export default function TournoisView() {
  const [recherche, setRecherche] = useState('')
  const [statut, setStatut] = useState('')
  const [message, setMessage] = useState('')
  const filtres = {}
  if (recherche) filtres.search = recherche
  if (statut) filtres.statut = statut

  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } = usePagine('/admin/tournois/', filtres)

  const agir = async (fn) => {
    setMessage('')
    try { await fn(); refresh() } catch (e) { setMessage(apiError(e)) }
  }

  return (
    <>
      <p className="section-note">
        Le badge étoile met un tournoi en avant gratuitement (geste commercial) ou retire une promotion.
        La suppression est définitive — équipes et résultats compris.
      </p>
      <div className="filtres">
        <input placeholder="Rechercher (titre, commune, e-mail orga)…" value={recherche} onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
        <select value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_TOURNOI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Tournoi</th><th>Promoteur</th><th>Dates</th><th>Frais</th><th>Équipes</th><th>Statut</th><th>Promu</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  {/* Sous-ligne : commune · sport · format · niveau */}
                  <td>{t.titre}<span className="sous">{t.commune} · {t.sport === 'football' ? 'Football' : 'Basket'} · {t.format} · {t.niveau}</span></td>
                  <td>{t.organisateur_nom}<span className="sous">{t.organisateur_email}</span></td>
                  <td>{fmtDate(t.date_debut)}</td>
                  <td>{Number(t.frais_inscription) > 0 ? fcfa(t.frais_inscription) : 'Gratuit'}</td>
                  <td>{t.nb_equipes}</td>
                  <td>
                    <select value={t.statut} onChange={(e) => agir(() => api.patch(`/admin/tournois/${t.id}/`, { statut: e.target.value }))}>
                      {Object.entries(STATUTS_TOURNOI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      className={t.mis_en_avant ? 'btn' : 'btn ghost'}
                      title={t.mis_en_avant ? 'Retirer la promotion' : 'Promouvoir gratuitement'}
                      onClick={() => agir(() => api.patch(`/admin/tournois/${t.id}/`, { mis_en_avant: !t.mis_en_avant }))}
                    >
                      <Star size={13} /> {t.mis_en_avant ? 'Promu' : 'Non'}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn danger"
                      onClick={() => window.confirm(`Supprimer définitivement « ${t.titre} » (équipes et résultats compris) ?`)
                        && agir(() => api.delete(`/admin/tournois/${t.id}/`))}
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
