import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ShieldCheck, Star, TrendingUp, TriangleAlert, Wallet, ArrowUpWideNarrow } from 'lucide-react'
import { getTournoi } from '../../api/tournaments.js'
import { initierPaiementTournoi, simulerPaiement } from '../../api/payments.js'
import { Spinner, Empty } from '../../components/ui/bits.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { fcfa, fmtDateRange, apiError, TARIF_CREATION_TOURNOI, TARIF_PUBLICATION_TOURNOI } from '../../lib/constants.js'

/**
 * Paiement d'un tournoi (promoteur) — récap + checkout GeniusPay.
 * Deux cas selon le statut : frais de publication (obligatoires, tournoi
 * en attente de paiement) ou promotion optionnelle (tournoi déjà publié).
 * En dev sans clés API, un bouton « Simuler le paiement » remplace le checkout.
 */
export default function PaiementTournoiPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const tournoi = useQuery({
    queryKey: ['tournoi', id],
    queryFn: () => getTournoi(id).then((r) => r.data),
  })

  // Publication à payer, ou promotion possible ?
  const publication = tournoi.data?.statut === 'en_attente_paiement'
  const promouvable = tournoi.data && !publication && !tournoi.data.mis_en_avant
    && !['termine', 'annule'].includes(tournoi.data.statut)
  const payable = publication || promouvable

  const paiement = useQuery({
    queryKey: ['paiement-init', id],
    queryFn: () => initierPaiementTournoi(id).then((r) => r.data),
    enabled: Boolean(payable),
    staleTime: Infinity,
    retry: false,
  })

  const simulation = useMutation({
    mutationFn: () => simulerPaiement(paiement.data.reference),
    onSuccess: () => navigate(`/paiement/retour?ref=${paiement.data.reference}`),
    onError: (e) => toast(apiError(e), 'error'),
  })

  if (tournoi.isLoading) return <Spinner />
  if (tournoi.isError || !tournoi.data) return <Empty icon={<TriangleAlert size={44} />}>Tournoi introuvable.</Empty>

  const t = tournoi.data
  if (!payable) {
    return (
      <div className="form-page center">
        <Empty icon={<ShieldCheck size={44} />}>
          {t.mis_en_avant
            ? 'Ce tournoi est déjà promu par HoopCI — rien à payer.'
            : 'Ce tournoi est terminé ou annulé : il ne peut plus être promu.'}
        </Empty>
        <button className="btn" onClick={() => navigate(`/tournois/${t.id}`)}><span>Voir le tournoi</span></button>
      </div>
    )
  }

  return (
    <div className="form-page">
      <span className="kicker orange">{publication ? 'Dernière étape' : 'Booste ta visibilité'}</span>
      <h1 style={{ fontSize: 30, margin: '10px 0 4px' }}>
        {publication ? <>Publier ce <span style={{ color: 'var(--orange)' }}>tournoi</span></>
          : <>Promouvoir ce <span style={{ color: 'var(--orange)' }}>tournoi</span></>}
      </h1>
      <p className="muted mb" style={{ fontSize: 13 }}>
        {publication
          ? 'Ton tournoi est prêt. Il apparaîtra dans l\'annuaire dès la confirmation du paiement des frais de publication.'
          : 'Ton tournoi est déjà publié. La promotion le met en avant auprès de toute la communauté.'}
      </p>

      <div className="panel">
        <h3>{t.titre}</h3>
        <div className="t-meta" style={{ marginBottom: 10 }}>
          <span><b>{t.commune}</b> · {t.lieu}</span>
          <span><b>{fmtDateRange(t.date_debut, t.date_fin)}</b></span>
          <span className="fmt">{t.format}</span>
        </div>
        {publication ? (
          <>
            <div className="rank-row">
              <ShieldCheck size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>Tournoi visible dans l'annuaire public HoopCI</div>
            </div>
            <div className="rank-row">
              <ArrowUpWideNarrow size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>Inscriptions d'équipes ouvertes dès la publication</div>
            </div>
            <div className="rank-row">
              <TrendingUp size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>Proposé aux joueurs dans les recommandations</div>
            </div>
          </>
        ) : (
          <>
            <div className="rank-row">
              <Star size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>Badge « Promu » et liseré orange sur ta carte</div>
            </div>
            <div className="rank-row">
              <ArrowUpWideNarrow size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>Affichage en tête de l'annuaire des tournois</div>
            </div>
            <div className="rank-row">
              <TrendingUp size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>Priorité dans les recommandations envoyées aux joueurs</div>
            </div>
          </>
        )}
        <div className="t-foot" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {publication ? 'Frais de publication' : 'Promotion du tournoi'}
          </span>
          <span className="price">
            {fcfa(paiement.data?.montant ?? (publication ? TARIF_CREATION_TOURNOI : TARIF_PUBLICATION_TOURNOI))}
          </span>
        </div>
      </div>

      {paiement.isLoading && <Spinner />}
      {paiement.isError && (
        <p className="alert red">{apiError(paiement.error, 'Impossible de préparer le paiement.')}</p>
      )}

      {paiement.data?.checkout_url && (
        <>
          <button className="btn block" onClick={() => { window.location.href = paiement.data.checkout_url }}>
            <span><Wallet size={16} /> Payer {fcfa(paiement.data.montant)} avec GeniusPay</span>
          </button>
          <p className="muted center" style={{ fontSize: 11.5, marginTop: 8 }}>
            Paiement sécurisé via GeniusPay — Wave, Orange Money, MTN MoMo, Moov ou carte bancaire.
          </p>
        </>
      )}

      {paiement.data?.simulation && (
        <>
          <p className="alert" style={{ fontSize: 12.5 }}>
            Mode développement : les clés GeniusPay ne sont pas configurées. Le paiement peut être simulé.
          </p>
          <button className="btn block green" onClick={() => simulation.mutate()} disabled={simulation.isPending}>
            <span>{simulation.isPending ? 'Simulation…' : 'Simuler le paiement (dev)'}</span>
          </button>
        </>
      )}

      <p className="muted center" style={{ fontSize: 11.5, marginTop: 14 }}>
        {publication
          ? 'Paiement unique par tournoi — la promotion reste optionnelle et se fait plus tard.'
          : 'Optionnel — ton tournoi reste visible dans l\'annuaire même sans promotion.'}
      </p>
    </div>
  )
}
