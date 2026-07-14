import { useState } from 'react'
import { Check, X } from 'lucide-react'
import api, { apiError } from '../api.js'
import { usePagine, Pagination, Spinner, Erreur, Pill, fcfa, fmtDate } from '../ui.jsx'

const TONE = { en_attente: 'warn', traite: 'ok', rejete: 'bad' }
const LABEL = { en_attente: 'En attente', traite: 'Payé', rejete: 'Rejeté' }

/** Demandes de retrait des promoteurs : marquer payé (débite le portefeuille) ou rejeter. */
export default function RetraitsView() {
  const [statut, setStatut] = useState('en_attente')
  const [message, setMessage] = useState('')
  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } =
    usePagine('/admin/retraits/', statut ? { statut } : {})

  const agir = async (r, action) => {
    if (action === 'traiter' && !window.confirm(`Confirmer le versement de ${fcfa(r.montant)} à ${r.promoteur_nom} (${r.numero}) ?`)) return
    setMessage('')
    try { await api.post(`/admin/retraits/${r.id}/${action}/`); refresh() } catch (e) { setMessage(apiError(e)) }
  }

  return (
    <>
      <p className="section-note">
        Quand un promoteur demande un retrait, effectue le versement Mobile Money vers son numéro,
        puis clique « Payé » (ce qui débite son portefeuille). « Rejeter » annule la demande sans débit.
      </p>
      <div className="filtres">
        {['en_attente', 'traite', 'rejete', ''].map((s) => (
          <button key={s || 'tous'} className={`chip ${statut === s ? 'actif' : ''}`} onClick={() => setStatut(s)}>
            {s ? LABEL[s] : 'Tous'}
          </button>
        ))}
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Promoteur</th><th>Montant</th><th>Numéro</th><th>Solde</th><th>Statut</th><th>Demandé</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 24 }}>Aucune demande.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.promoteur_nom}<span className="sous">{r.promoteur_email}</span></td>
                  <td className="montant"><b>{fcfa(r.montant)}</b></td>
                  <td>{r.numero}</td>
                  <td>{fcfa(r.solde)}</td>
                  <td><Pill tone={TONE[r.statut]}>{LABEL[r.statut] || r.statut}</Pill></td>
                  <td>{fmtDate(r.created_at)}</td>
                  <td>
                    {r.statut === 'en_attente' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn" onClick={() => agir(r, 'traiter')}><Check size={13} /> Payé</button>
                        <button className="btn danger" onClick={() => agir(r, 'rejeter')}><X size={13} /></button>
                      </div>
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
