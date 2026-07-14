import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { getStatutPaiement } from '../../api/payments.js'
import { Spinner, Empty } from '../../components/ui/bits.jsx'

/**
 * Page de retour du checkout GeniusPay — poll le statut jusqu'à confirmation
 * (le webhook ou la re-vérification côté serveur fait foi).
 */
export default function RetourPaiementPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const reference = params.get('ref')

  const { data, isError } = useQuery({
    queryKey: ['paiement-statut', reference],
    queryFn: () => getStatutPaiement(reference).then((r) => r.data),
    enabled: Boolean(reference),
    refetchInterval: (query) => (query.state.data?.statut === 'en_attente' ? 3000 : false),
  })

  if (!reference || isError) {
    return <Empty icon={<TriangleAlert size={44} />}>Paiement introuvable.</Empty>
  }

  if (!data || data.statut === 'en_attente') {
    return (
      <div className="form-page center" style={{ paddingTop: 60 }}>
        <Spinner />
        <h1 style={{ fontSize: 24 }}>Vérification du paiement…</h1>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          Confirme le paiement sur ton téléphone si ce n'est pas déjà fait. Cette page se met à jour automatiquement.
        </p>
      </div>
    )
  }

  if (data.statut === 'reussi') {
    qc.invalidateQueries({ queryKey: ['tournois'] })
    qc.invalidateQueries({ queryKey: ['mes-tournois'] })
    qc.invalidateQueries({ queryKey: ['tournoi', String(data.tournoi_id)] })
    const type = data.type_paiement
    const messages = {
      creation_tournoi: <>Ton tournoi est maintenant <b style={{ color: 'var(--orange)' }}>publié</b> : il apparaît
        dans l'annuaire et les équipes peuvent s'inscrire.</>,
      inscription_equipe: <>Ton équipe est <b style={{ color: 'var(--orange)' }}>inscrite au tournoi</b> —
        elle apparaît maintenant sur la fiche du tournoi.</>,
      promotion_compte: <>Ton compte est <b style={{ color: 'var(--orange)' }}>promu pour 30 jours</b> : carte en tête
        du marché de talents et points de grade boostés (×1,15).</>,
      promotion_equipe: <>Ton équipe est <b style={{ color: 'var(--orange)' }}>promue</b> : badge sur la fiche du
        tournoi et points de grade boostés (×1,15) pour tous ses membres.</>,
    }
    return (
      <div className="form-page center" style={{ paddingTop: 60 }}>
        <CircleCheck size={54} style={{ color: 'var(--green)' }} />
        <h1 style={{ fontSize: 26, margin: '12px 0 6px' }}>Paiement confirmé !</h1>
        <p className="muted mb" style={{ fontSize: 13.5 }}>
          {messages[type] ?? <>Ton tournoi est maintenant <b style={{ color: 'var(--orange)' }}>promu par HoopCI</b> : badge « Promu »,
            tête de liste et priorité dans les recommandations aux joueurs.</>}
        </p>
        <button
          className="btn"
          onClick={() => navigate(
            type === 'promotion_compte' ? '/profil'
              : data.tournoi_id ? `/tournois/${data.tournoi_id}` : '/',
          )}
        >
          <span>{type === 'promotion_compte' ? 'Retour à mon profil' : 'Voir le tournoi'}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="form-page center" style={{ paddingTop: 60 }}>
      <CircleX size={54} style={{ color: 'var(--red)' }} />
      <h1 style={{ fontSize: 26, margin: '12px 0 6px' }}>Paiement non abouti</h1>
      <p className="muted mb" style={{ fontSize: 13.5 }}>
        Le paiement est « {data.statut} ». Aucun montant n'a été débité si tu as annulé — tu peux réessayer.
      </p>
      {data.tournoi_id && (
        <button className="btn" onClick={() => navigate(`/paiement/tournoi/${data.tournoi_id}`)}>
          <span>Réessayer le paiement</span>
        </button>
      )}
    </div>
  )
}
