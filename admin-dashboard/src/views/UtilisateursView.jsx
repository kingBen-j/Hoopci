import { useState } from 'react'
import api, { apiError } from '../api.js'
import {
  usePagine, Pagination, Pill, Spinner, Erreur, fmtDate, ROLES,
} from '../ui.jsx'

/** Gestion des comptes : rôle, activation / désactivation. */
export default function UtilisateursView() {
  const [recherche, setRecherche] = useState('')
  const [role, setRole] = useState('')
  const [message, setMessage] = useState('')
  const filtres = {}
  if (recherche) filtres.search = recherche
  if (role) filtres.role = role

  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } = usePagine('/admin/utilisateurs/', filtres)

  const patcher = async (id, corps) => {
    setMessage('')
    try {
      await api.patch(`/admin/utilisateurs/${id}/`, corps)
      refresh()
    } catch (e) {
      setMessage(apiError(e))
    }
  }

  return (
    <>
      <div className="filtres">
        <input
          placeholder="Rechercher (nom, e-mail, commune)…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tous les rôles</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Utilisateur</th><th>Rôle</th><th>Commune</th><th>Badges</th><th>Inscrit le</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                  <td>{u.nom_complet}<span className="sous">{u.email}{u.telephone ? ` · ${u.telephone}` : ''}</span></td>
                  <td>
                    {u.is_staff ? (
                      <Pill tone="accent">Staff</Pill>
                    ) : (
                      <select value={u.role} onChange={(e) => patcher(u.id, { role: e.target.value })}>
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    )}
                  </td>
                  <td>{u.commune || <span className="muted">—</span>}</td>
                  <td>
                    {u.is_minor && <Pill tone="warn">Mineur</Pill>}{' '}
                    {!u.is_active && <Pill tone="bad">Désactivé</Pill>}
                  </td>
                  <td>{fmtDate(u.date_joined)}</td>
                  <td>
                    {!u.is_staff && (
                      u.is_active ? (
                        <button className="btn danger" onClick={() => window.confirm(`Désactiver le compte de ${u.nom_complet} ? Il ne pourra plus se connecter.`) && patcher(u.id, { is_active: false })}>
                          Désactiver
                        </button>
                      ) : (
                        <button className="btn vert" onClick={() => patcher(u.id, { is_active: true })}>
                          Réactiver
                        </button>
                      )
                    )}
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
