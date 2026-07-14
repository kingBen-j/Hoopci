import { useCallback, useEffect, useState } from 'react'
import api from './api.js'

/** GET simple avec rechargement manuel — suffisant pour un back-office. */
export function useApi(url, params) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(params ?? {})

  useEffect(() => {
    let actif = true
    setLoading(true)
    setError(null)
    api.get(url, { params: JSON.parse(key) })
      .then((r) => actif && setData(r.data))
      .catch((e) => actif && setError(e))
      .finally(() => actif && setLoading(false))
    return () => { actif = false }
  }, [url, key, tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, refresh }
}

/** 125000 → « 125 000 FCFA » */
export const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtDate = (iso) => (iso ? DATE_FMT.format(new Date(iso)) : '—')

export const ROLES = {
  promoteur: 'Promoteur',
  joueur: 'Joueur',
  client: 'Client / Recruteur',
}

export const STATUTS_TOURNOI = {
  en_attente_paiement: 'En attente de paiement',
  ouvert: 'Ouvert', complet: 'Complet', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé',
}
export const STATUTS_EVENEMENT = {
  a_venir: 'À venir', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé',
}
export const STATUTS_PAIEMENT = {
  en_attente: 'En attente', reussi: 'Réussi', echoue: 'Échoué', annule: 'Annulé', expire: 'Expiré',
}
export const TYPES_EVENEMENT = {
  exhibition: 'Exhibition', camp: 'Camp', dunk_contest: 'Dunk contest',
  animation: 'Animation', caritatif: 'Caritatif', autre: 'Autre',
}
export const GRADES = { bronze: 'Bronze', argent: 'Argent', or: 'Or', platine: 'Platine', legende: 'Légende' }

export function Pill({ tone = 'neutre', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export const tonePaiement = { reussi: 'ok', en_attente: 'warn', echoue: 'bad', annule: 'bad', expire: 'neutre' }
export const toneTournoi = { en_attente_paiement: 'warn', ouvert: 'ok', complet: 'warn', en_cours: 'warn', termine: 'neutre', annule: 'bad' }

export function Spinner() {
  return <div className="spinner" aria-label="Chargement" />
}

export function Erreur({ error }) {
  return <p className="alerte">{error?.response?.data?.detail || 'Impossible de charger les données.'}</p>
}

/** Liste paginée DRF — déplie {results} et gère Précédent / Suivant. */
export function usePagine(url, filtres) {
  const [page, setPage] = useState(1)
  const key = JSON.stringify(filtres ?? {})
  useEffect(() => { setPage(1) }, [url, key])
  const query = useApi(url, { ...(filtres ?? {}), page })
  const rows = query.data?.results ?? query.data ?? []
  return { ...query, rows, page, setPage, hasNext: Boolean(query.data?.next), hasPrev: Boolean(query.data?.previous) }
}

export function Pagination({ page, setPage, hasNext, hasPrev }) {
  if (!hasNext && !hasPrev) return null
  return (
    <div className="pagination">
      <button disabled={!hasPrev} onClick={() => setPage(page - 1)}>← Précédent</button>
      <span>Page {page}</span>
      <button disabled={!hasNext} onClick={() => setPage(page + 1)}>Suivant →</button>
    </div>
  )
}
