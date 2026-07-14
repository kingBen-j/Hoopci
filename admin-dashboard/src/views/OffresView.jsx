import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import api, { apiError } from '../api.js'
import { usePagine, Pagination, Spinner, Erreur, Pill, fmtDate } from '../ui.jsx'

const TONE_OFFRE = { en_attente: 'warn', acceptee: 'ok', refusee: 'bad' }
const LABEL_OFFRE = { en_attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée' }

/** Modération des offres du marché de talents (lecture + suppression). */
export default function OffresView() {
  const [recherche, setRecherche] = useState('')
  const [statut, setStatut] = useState('')
  const [message, setMessage] = useState('')
  const filtres = {}
  if (recherche) filtres.search = recherche
  if (statut) filtres.statut = statut

  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } = usePagine('/admin/offres/', filtres)

  const supprimer = async (offre) => {
    if (!window.confirm('Supprimer définitivement cette offre ?')) return
    setMessage('')
    try { await api.delete(`/admin/offres/${offre.id}/`); refresh() } catch (e) { setMessage(apiError(e)) }
  }

  return (
    <>
      <p className="section-note">
        Toutes les offres envoyées aux joueurs — supprimer celles au contenu abusif.
      </p>
      <div className="filtres">
        <input placeholder="Rechercher (e-mail, message)…" value={recherche} onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
        <select value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(LABEL_OFFRE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>De</th><th>À</th><th>Message</th><th>Statut</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>{o.emetteur_email}</td>
                  <td>{o.joueur_email}</td>
                  <td style={{ maxWidth: 340 }}>{o.message.length > 120 ? `${o.message.slice(0, 120)}…` : o.message}</td>
                  <td><Pill tone={TONE_OFFRE[o.statut] || 'neutre'}>{LABEL_OFFRE[o.statut] || o.statut}</Pill></td>
                  <td>{fmtDate(o.created_at)}</td>
                  <td>
                    <button className="btn danger" onClick={() => supprimer(o)}><Trash2 size={13} /></button>
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
