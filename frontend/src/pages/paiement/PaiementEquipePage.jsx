import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { TriangleAlert, Users, Wallet, ShieldCheck } from 'lucide-react'
import { initierPaiementEquipe, simulerPaiement } from '../../api/payments.js'
import { Spinner, Empty } from '../../components/ui/bits.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { fcfa, apiError } from '../../lib/constants.js'

/**
 * Paiement de l'inscription d'une équipe à un tournoi : part plateforme
 * (500 FCFA) + frais d'inscription du tournoi, en un seul checkout GeniusPay.
 * L'équipe n'apparaît sur la fiche du tournoi qu'après confirmation.
 */
export default function PaiementEquipePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const paiement = useQuery({
    queryKey: ['paiement-equipe', id],
    queryFn: () => initierPaiementEquipe(id).then((r) => r.data),
    staleTime: Infinity,
    retry: false,
  })

  const simulation = useMutation({
    mutationFn: () => simulerPaiement(paiement.data.reference),
    onSuccess: () => navigate(`/paiement/retour?ref=${paiement.data.reference}`),
    onError: (e) => toast(apiError(e), 'error'),
  })

  if (paiement.isLoading) return <Spinner />
  if (paiement.isError) {
    return (
      <div className="form-page center">
        <Empty icon={<TriangleAlert size={44} />}>
          {apiError(paiement.error, "Impossible de préparer le paiement de l'inscription.")}
        </Empty>
        <button className="btn" onClick={() => navigate(-1)}><span>Retour</span></button>
      </div>
    )
  }

  const p = paiement.data
  return (
    <div className="form-page">
      <span className="kicker orange">Dernière étape</span>
      <h1 style={{ fontSize: 30, margin: '10px 0 4px' }}>
        Inscrire l'<span style={{ color: 'var(--orange)' }}>équipe</span>
      </h1>
      <p className="muted mb" style={{ fontSize: 13 }}>
        L'équipe <b>{p.equipe_nom}</b> rejoindra le tournoi « {p.tournoi_titre} » dès la
        confirmation du paiement.
      </p>

      <div className="panel">
        <h3><Users size={16} style={{ verticalAlign: '-2px' }} /> {p.equipe_nom}</h3>
        <div className="rank-row">
          <ShieldCheck size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13 }}>Frais de plateforme HoopCI</div>
          <b style={{ fontSize: 13 }}>{fcfa(p.frais_plateforme)}</b>
        </div>
        <div className="rank-row">
          <Wallet size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13 }}>Frais d'inscription du tournoi</div>
          <b style={{ fontSize: 13 }}>{fcfa(p.frais_tournoi)}</b>
        </div>
        <div className="t-foot" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total à payer</span>
          <span className="price">{fcfa(p.montant)}</span>
        </div>
      </div>

      {p.checkout_url && (
        <>
          <button className="btn block" onClick={() => { window.location.href = p.checkout_url }}>
            <span><Wallet size={16} /> Payer {fcfa(p.montant)} avec GeniusPay</span>
          </button>
          <p className="muted center" style={{ fontSize: 11.5, marginTop: 8 }}>
            Paiement sécurisé via GeniusPay — Wave, Orange Money, MTN MoMo, Moov ou carte bancaire.
          </p>
        </>
      )}

      {p.simulation && (
        <>
          <p className="alert" style={{ fontSize: 12.5 }}>
            Mode développement : les clés GeniusPay ne sont pas configurées. Le paiement peut être simulé.
          </p>
          <button className="btn block green" onClick={() => simulation.mutate()} disabled={simulation.isPending}>
            <span>{simulation.isPending ? 'Simulation…' : 'Simuler le paiement (dev)'}</span>
          </button>
        </>
      )}
    </div>
  )
}
