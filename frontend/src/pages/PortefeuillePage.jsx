import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet, TrendingUp, ArrowDownToLine, TriangleAlert, HandCoins } from 'lucide-react'
import { getPortefeuille, demanderRetrait } from '../api/payments.js'
import { Spinner, Empty } from '../components/ui/bits.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { fcfa, fmtDate, apiError } from '../lib/constants.js'

const STATUT_RETRAIT = { en_attente: 'En attente', traite: 'Payé', rejete: 'Rejeté' }

/**
 * Portefeuille du promoteur : solde (frais d'inscription des équipes, moins la
 * part plateforme de 500 FCFA/équipe), historique, et demande de retrait vers
 * Mobile Money (récolter l'argent de ses tournois).
 */
export default function PortefeuillePage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [montant, setMontant] = useState('')
  const [numero, setNumero] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portefeuille'],
    queryFn: () => getPortefeuille().then((r) => r.data),
  })

  const retrait = useMutation({
    mutationFn: () => demanderRetrait(Number(montant), numero.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portefeuille'] })
      setMontant(''); setNumero('')
      toast('Demande de retrait envoyée — elle sera traitée par HoopCI.')
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  if (isLoading) return <Spinner />
  if (isError || !data) return <Empty icon={<TriangleAlert size={44} />}>Portefeuille indisponible.</Empty>

  return (
    <div className="wrap" style={{ paddingTop: 24, maxWidth: 720 }}>
      <span className="kicker orange">Espace promoteur</span>
      <h1 style={{ fontSize: 32, marginTop: 10 }}>Mon <span style={{ color: 'var(--orange)' }}>portefeuille</span></h1>
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
        Les frais d'inscription payés par les équipes te sont crédités automatiquement,
        après le prélèvement de {fcfa(data.part_plateforme)} par équipe pour la plateforme.
      </p>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat"><b>{fcfa(data.solde)}</b><span>Solde total</span></div>
        <div className="stat"><b>{fcfa(data.disponible)}</b><span>Disponible au retrait</span></div>
        <div className="stat"><b>{fcfa(data.total_reverse)}</b><span>Déjà reçu</span></div>
      </div>

      {/* Demande de retrait vers Mobile Money */}
      <div className="panel mt">
        <h3><HandCoins size={16} style={{ verticalAlign: '-2px' }} /> Récolter mon argent</h3>
        <p className="muted mb" style={{ fontSize: 12.5 }}>
          Demande un versement de ton solde disponible vers ton numéro Mobile Money.
        </p>
        <form className="form" onSubmit={(e) => { e.preventDefault(); if (Number(montant) > 0 && numero.trim()) retrait.mutate() }}>
          <div className="row2">
            <div className="field">
              <label>Montant (FCFA)</label>
              <input type="number" min="500" max={data.disponible} value={montant}
                onChange={(e) => setMontant(e.target.value)} placeholder={`max ${data.disponible}`} required />
            </div>
            <div className="field">
              <label>Numéro Mobile Money</label>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="+225 07 …" required />
            </div>
          </div>
          <button className="btn sm" type="submit" disabled={retrait.isPending || data.disponible <= 0} style={{ alignSelf: 'flex-start' }}>
            <span>{retrait.isPending ? 'Envoi…' : 'Demander le retrait'}</span>
          </button>
        </form>
      </div>

      {/* Demandes de retrait en cours / passées */}
      {data.retraits.length > 0 && (
        <div className="panel mt">
          <h3>Mes retraits</h3>
          {data.retraits.map((r) => (
            <div className="rank-row" key={r.id}>
              <ArrowDownToLine size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{fcfa(r.montant)} → {r.numero}</b>
                <p className="muted" style={{ fontSize: 11.5 }}>{fmtDate(r.created_at)}</p>
              </div>
              <span className={`status st-${r.statut === 'traite' ? 'ouvert' : r.statut === 'rejete' ? 'annule' : 'en_attente'}`}>
                <span>{STATUT_RETRAIT[r.statut] || r.statut}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Historique des mouvements */}
      <div className="panel mt">
        <h3><Wallet size={16} style={{ verticalAlign: '-2px' }} /> Mouvements</h3>
        {data.mouvements.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Aucun mouvement pour l'instant.</p>}
        {data.mouvements.map((m) => {
          const credit = m.montant >= 0
          return (
            <div className="rank-row" key={m.id}>
              {credit
                ? <TrendingUp size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                : <ArrowDownToLine size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{m.libelle || (credit ? 'Crédit' : 'Retrait')}</b>
                <p className="muted" style={{ fontSize: 11.5 }}>{fmtDate(m.created_at)}</p>
              </div>
              <b style={{ color: credit ? 'var(--green)' : 'var(--orange)', fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 17 }}>
                {credit ? '+' : ''}{fcfa(m.montant)}
              </b>
            </div>
          )
        })}
      </div>
    </div>
  )
}
