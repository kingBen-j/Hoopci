import { useState } from 'react'
import { Banknote } from 'lucide-react'
import api, { apiError } from '../api.js'
import { usePagine, Pagination, Spinner, Erreur, fcfa, fmtDate } from '../ui.jsx'

/** Portefeuilles des promoteurs : soldes dus + enregistrement des reversements. */
export default function PortefeuillesView() {
  const [recherche, setRecherche] = useState('')
  const [message, setMessage] = useState('')
  const filtres = recherche ? { search: recherche } : {}
  const { rows, loading, error, refresh, page, setPage, hasNext, hasPrev } = usePagine('/admin/portefeuilles/', filtres)

  const reverser = async (pf) => {
    const saisie = window.prompt(`Reverser combien à ${pf.promoteur_nom} ? (solde dû : ${fcfa(pf.solde)})`, pf.solde)
    if (saisie === null) return
    const montant = Number(saisie)
    if (!montant || montant <= 0) { setMessage('Montant invalide.'); return }
    setMessage('')
    try { await api.post(`/admin/portefeuilles/${pf.id}/reverser/`, { montant }); refresh() } catch (e) { setMessage(apiError(e)) }
  }

  return (
    <>
      <p className="section-note">
        Chaque inscription d'équipe crédite le portefeuille du promoteur (frais du tournoi) ;
        la plateforme prélève 500 FCFA par équipe. « Reverser » enregistre un versement au promoteur.
      </p>
      <div className="filtres">
        <input placeholder="Rechercher un promoteur (nom, e-mail)…" value={recherche} onChange={(e) => setRecherche(e.target.value)} style={{ minWidth: 260 }} />
      </div>
      {message && <p className="alerte">{message}</p>}

      {loading && <Spinner />}
      {error && <Erreur error={error} />}
      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Promoteur</th><th>Solde dû</th><th>Total crédité</th><th>Déjà reversé</th><th>Maj</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>Aucun portefeuille.</td></tr>
              )}
              {rows.map((pf) => (
                <tr key={pf.id}>
                  <td>{pf.promoteur_nom}<span className="sous">{pf.promoteur_email}</span></td>
                  <td className="montant"><b>{fcfa(pf.solde)}</b></td>
                  <td>{fcfa(pf.total_credite)}</td>
                  <td>{fcfa(pf.total_reverse)}</td>
                  <td>{fmtDate(pf.updated_at)}</td>
                  <td>
                    <button className="btn ghost" disabled={Number(pf.solde) <= 0} onClick={() => reverser(pf)}>
                      <Banknote size={13} /> Reverser
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
