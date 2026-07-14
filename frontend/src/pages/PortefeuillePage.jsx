import { useQuery } from '@tanstack/react-query'
import { Wallet, TrendingUp, ArrowDownToLine, TriangleAlert } from 'lucide-react'
import { getPortefeuille } from '../api/payments.js'
import { Spinner, Empty } from '../components/ui/bits.jsx'
import { fcfa, fmtDate } from '../lib/constants.js'

/**
 * Portefeuille du promoteur : solde dû (frais d'inscription des équipes, moins la
 * part plateforme de 500 FCFA par équipe) + historique des mouvements.
 */
export default function PortefeuillePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portefeuille'],
    queryFn: () => getPortefeuille().then((r) => r.data),
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
        <div className="stat"><b>{fcfa(data.solde)}</b><span>Solde à recevoir</span></div>
        <div className="stat"><b>{fcfa(data.total_credite)}</b><span>Total crédité</span></div>
        <div className="stat"><b>{fcfa(data.total_reverse)}</b><span>Déjà reversé</span></div>
      </div>

      <div className="panel mt">
        <h3><Wallet size={16} style={{ verticalAlign: '-2px' }} /> Mouvements</h3>
        {data.mouvements.length === 0 && (
          <p className="muted" style={{ fontSize: 13 }}>Aucun mouvement pour l'instant.</p>
        )}
        {data.mouvements.map((m) => {
          const credit = m.montant >= 0
          return (
            <div className="rank-row" key={m.id}>
              {credit
                ? <TrendingUp size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                : <ArrowDownToLine size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{m.libelle || (credit ? 'Crédit' : 'Reversement')}</b>
                <p className="muted" style={{ fontSize: 11.5 }}>{fmtDate(m.created_at)}</p>
              </div>
              <b style={{ color: credit ? 'var(--green)' : 'var(--orange)', fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 17 }}>
                {credit ? '+' : ''}{fcfa(m.montant)}
              </b>
            </div>
          )
        })}
      </div>

      <p className="muted" style={{ fontSize: 11.5, marginTop: 14 }}>
        Le solde à recevoir est reversé par l'équipe HoopCI. Contacte-nous pour organiser le versement.
      </p>
    </div>
  )
}
