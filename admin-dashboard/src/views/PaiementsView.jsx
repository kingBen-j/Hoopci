import { useState } from 'react'
import {
  useApi, usePagine, Pagination, Pill, Spinner, Erreur,
  fcfa, fmtDate, STATUTS_PAIEMENT, TYPES_PAIEMENT, tonePaiement,
} from '../ui.jsx'

/** Suivi de toutes les transactions GeniusPay : type, montants, statuts, mode. */
export default function PaiementsView() {
  const [statut, setStatut] = useState('')
  const [type, setType] = useState('')
  const stats = useApi('/admin/stats/')
  const filtres = {}
  if (statut) filtres.statut = statut
  if (type) filtres.type_paiement = type
  const { rows, loading, error, page, setPage, hasNext, hasPrev } = usePagine('/admin/paiements/', filtres)

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
        <button className={`chip ${statut === '' ? 'actif' : ''}`} onClick={() => setStatut('')}>Tous statuts</button>
        {Object.entries(STATUTS_PAIEMENT).map(([k, v]) => (
          <button key={k} className={`chip ${statut === k ? 'actif' : ''}`} onClick={() => setStatut(k)}>{v}</button>
        ))}
      </div>
      <div className="filtres">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous types de transaction</option>
          {Object.entries(TYPES_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Référence</th><th>Client</th><th>Type</th><th>Concerne</th><th>Montant</th>
                <th>Statut</th><th>Mode</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 24 }}>Aucune transaction.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.reference}
                    {r.genius_reference && <span className="sous">{r.genius_reference}</span>}
                  </td>
                  <td>{r.utilisateur_nom}<span className="sous">{r.utilisateur_email}</span></td>
                  <td>{r.type_label || TYPES_PAIEMENT[r.type_paiement] || r.type_paiement}</td>
                  <td>{r.equipe_nom || r.tournoi_titre || <span className="muted">—</span>}</td>
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
