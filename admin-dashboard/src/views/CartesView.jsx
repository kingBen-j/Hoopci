import { useState } from 'react'
import { BadgeCheck, Star } from 'lucide-react'
import api, { apiError } from '../api.js'
import {
  usePagine, Pagination, Pill, Spinner, Erreur, fmtDate, GRADES,
} from '../ui.jsx'

/** Modération du marché : badge vérifié et mise en avant des cartes de transfert. */
export default function CartesView() {
  const [recherche, setRecherche] = useState('')
  const [message, setMessage] = useState('')
  const filtres = recherche ? { search: recherche } : {}

  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } = usePagine('/admin/cartes/', filtres)

  const patcher = async (id, corps) => {
    setMessage('')
    try { await api.patch(`/admin/cartes/${id}/`, corps); refresh() } catch (e) { setMessage(apiError(e)) }
  }

  return (
    <>
      <p className="section-note">
        Le badge vérifié atteste l'identité d'un joueur. La mise en avant boostée est un service payant / geste commercial.
      </p>
      <div className="filtres">
        <input placeholder="Rechercher un joueur…" value={recherche} onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 240 }} />
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Joueur</th><th>Grade</th><th>Marché</th><th>Vérifié</th><th>Mise en avant</th><th>Modifiée le</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.joueur_nom}<span className="sous">{c.joueur_email}</span></td>
                  <td>{GRADES[c.grade] || <span className="muted">—</span>}</td>
                  <td>{c.disponible ? <Pill tone="ok">Disponible</Pill> : <Pill tone="neutre">Retiré</Pill>}</td>
                  <td>
                    <button
                      className={c.badge_verifie ? 'btn vert' : 'btn ghost'}
                      onClick={() => patcher(c.id, { badge_verifie: !c.badge_verifie })}
                    >
                      <BadgeCheck size={13} /> {c.badge_verifie ? 'Vérifié' : 'Non'}
                    </button>
                  </td>
                  <td>
                    <button
                      className={c.mise_en_avant ? 'btn' : 'btn ghost'}
                      onClick={() => patcher(c.id, { mise_en_avant: !c.mise_en_avant })}
                    >
                      <Star size={13} /> {c.mise_en_avant ? 'Boostée' : 'Non'}
                    </button>
                  </td>
                  <td>{fmtDate(c.updated_at)}</td>
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
