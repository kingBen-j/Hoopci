import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Shield, Star, TriangleAlert, UserPlus, Users } from 'lucide-react'
import { getMesEquipes } from '../../api/tournaments.js'
import { promouvoirEquipe, initierPaiementEquipe, simulerPaiement } from '../../api/payments.js'
import { StatusBadge, Spinner, Empty } from '../../components/ui/bits.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { CATEGORIES_AGE, FORMAT_LABELS, TARIF_PROMOTION_EQUIPE, fcfa, fmtDate, unwrap, apiError } from '../../lib/constants.js'

/**
 * Mes équipes (joueur) : effectif vs minimum du format, statut de l'inscription,
 * promotion payante. Tous les coéquipiers doivent avoir un compte HoopCI et
 * rejoindre l'équipe — sinon les points de grade du tournoi sont réduits.
 */
export default function MesEquipesPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mes-equipes'],
    queryFn: () => getMesEquipes().then((r) => unwrap(r.data)),
  })

  // Promotion ou paiement d'inscription : redirige vers le checkout GeniusPay
  // (ou la simulation en dev sans clés)
  const paiement = useMutation({
    mutationFn: ({ equipeId, promotion }) =>
      (promotion ? promouvoirEquipe(equipeId) : initierPaiementEquipe(equipeId)).then((r) => r.data),
    onSuccess: async (p) => {
      if (p.checkout_url) {
        window.location.href = p.checkout_url
      } else if (p.simulation) {
        await simulerPaiement(p.reference)
        navigate(`/paiement/retour?ref=${p.reference}`)
      }
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  const equipes = data ?? []

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <span className="kicker">Mon vestiaire</span>
      <h1 style={{ fontSize: 32, marginTop: 10 }}>
        Mes <span style={{ color: 'var(--green)' }}>équipes</span>
      </h1>
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 14px' }}>
        Tous tes coéquipiers doivent avoir un compte HoopCI et rejoindre l'équipe depuis la fiche
        du tournoi — une équipe incomplète gagne 40 % de points de grade en moins.
      </p>

      {isLoading && <Spinner />}
      {isError && <Empty icon={<TriangleAlert size={44} />}>Impossible de charger tes équipes.</Empty>}
      {!isLoading && !isError && equipes.length === 0 && (
        <Empty icon={<Shield size={44} />}>
          Aucune équipe pour l'instant — inscris ton équipe depuis la fiche d'un tournoi ouvert.
        </Empty>
      )}

      <div className="grid two mt">
        {equipes.map((e) => {
          const complet = e.effectif_complet
          return (
            <article className="t-card" key={e.id} style={{ cursor: 'default' }}>
              <div className="t-body">
                <div className="o-head">
                  <b>{e.nom}</b>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {e.mise_en_avant && (
                      <span className="dispo-pill orange"><Star size={10} style={{ verticalAlign: '-1px' }} /> Promue</span>
                    )}
                    <StatusBadge statut={e.tournoi.statut} />
                  </span>
                </div>
                <div className="t-meta">
                  <span>
                    {e.tournoi.titre} · {FORMAT_LABELS[e.tournoi.format] || e.tournoi.format} · {fmtDate(e.tournoi.date_debut)}
                  </span>
                </div>

                {/* Effectif : X joueurs inscrits sur le minimum exigé par le format */}
                <div className="winbar">
                  <span><Users size={13} style={{ verticalAlign: '-2px' }} /> {e.membres.length}/{e.effectif_min || '—'} joueurs</span>
                  <div className="bar">
                    <i style={{ width: `${e.effectif_min ? Math.min((e.membres.length / e.effectif_min) * 100, 100) : 100}%` }} />
                  </div>
                </div>
                {!complet && (
                  <p className="alert" style={{ fontSize: 12 }}>
                    <TriangleAlert size={13} style={{ verticalAlign: '-2px' }} /> Effectif incomplet : demande à tes
                    coéquipiers de créer leur compte puis de « Rejoindre » l'équipe sur la fiche du tournoi,
                    sinon les points de grade seront réduits de 40 %.
                  </p>
                )}
                <p className="muted" style={{ fontSize: 12 }}>
                  {e.membres.map((m) => m.nom).join(' · ') || 'Aucun joueur'}
                </p>

                {!e.payee && (
                  <button className="btn sm block" onClick={() => paiement.mutate({ equipeId: e.id, promotion: false })} disabled={paiement.isPending}>
                    <span>Payer l'inscription</span>
                  </button>
                )}
                {e.payee && !e.mise_en_avant && !['termine', 'annule'].includes(e.tournoi.statut) && (
                  <button className="btn sm block" onClick={() => paiement.mutate({ equipeId: e.id, promotion: true })} disabled={paiement.isPending}>
                    <span><Star size={14} /> Promouvoir l'équipe ({fcfa(TARIF_PROMOTION_EQUIPE)}) — points ×1,15</span>
                  </button>
                )}
                <div className="o-actions">
                  <button className="btn sm dark" style={{ flex: 1 }} onClick={() => navigate(`/tournois/${e.tournoi.id}`)}>
                    <span>Voir le tournoi</span>
                  </button>
                  <button className="btn sm green" style={{ flex: 1 }} onClick={() => navigate(`/tournois/${e.tournoi.id}`)}>
                    <span><UserPlus size={14} /> Inviter (fiche tournoi)</span>
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
