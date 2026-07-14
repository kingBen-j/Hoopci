import { useState } from 'react'
import {
  useApi, usePagine, Pagination, Pill, Spinner, Erreur,
  fcfa, fmtDate, STATUTS_PAIEMENT, tonePaiement,
} from '../ui.jsx'

/** Suivi de tous les paiements GeniusPay : montants, statuts, mode. */
export default function PaiementsView() {
  const [statut, setStatut] = useState('')
  const stats = useApi('/admin/stats/')
  const { rows, loading, error, page, setPage, hasNext, hasPrev } = usePagine(
    '/admin/paiements/', statut ? { statut } : {},
  )

  const p = stats.data?.paiements

  return (
    <>
      {p && (
        <div className="tiles" style={{ marginBottom: 14 }}>
          <div className="tile hero"><b>{fcfa(p.revenus_confirmes)}</b><small>Total encaissé</small></div>
          <div className="tile neutral"><b>{fcfa(p.montant_en_attente)}</b><small>En attente</small></div>
          <div className="tile green"><b>{p.par_statut?.reussi ?? 0}</b><small>Paiements réussis</small></div>
          <div className="tile neutral"><b>{(p.par_statut?.echoue ?? 0) + (p.par_statut?.annule ?? 0) + (p.par_statut?.expire ?? 0)}</b><small>Échoués / annulés / expirés</small></div>
        </div>
      )}

      <div className="filtres">
        <button className={`chip ${statut === '' ? 'actif' : ''}`} onClick={() => setStatut('')}>Tous</button>
        {Object.entries(STATUTS_PAIEMENT).map(([k, v]) => (
          <button key={k} className={`chip ${statut === k ? 'actif' : ''}`} onClick={() => setStatut(k)}>{v}</button>
        ))}
      </div>

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Référence</th><th>Client</th><th>Tournoi</th><th>Montant</th>
                <th>Statut</th><th>Mode</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 24 }}>Aucun paiement.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.reference}
                    {r.genius_reference && <span className="sous">{r.genius_reference}</span>}
                  </td>
                  <td>{r.utilisateur_nom}<span className="sous">{r.utilisateur_email}</span></td>
                  <td>{r.tournoi_titre || <span className="muted">—</span>}</td>
                  <td className="montant">{fcfa(r.montant)}</td>
                  <td><Pill tone={tonePaiement[r.statut]}>{STATUTS_PAIEMENT[r.statut] || r.statut}</Pill></td>
                  <td>{r.simulation ? <Pill tone="warn">Simulation</Pill> : <Pill tone="accent">GeniusPay</Pill>}</td>
                  <td>{fmtDate(r.created_at)}</td>
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
