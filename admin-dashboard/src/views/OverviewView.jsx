import { useApi, fcfa, Spinner, Erreur, ROLES, STATUTS_TOURNOI, STATUTS_PAIEMENT, GRADES } from '../ui.jsx'

const MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })

/** Vue d'ensemble : tous les indicateurs de la plateforme + revenus. */
export default function OverviewView() {
  const { data: s, loading, error } = useApi('/admin/stats/')

  if (loading) return <Spinner />
  if (error || !s) return <Erreur error={error} />

  const offres = s.marche.offres_par_statut || {}

  return (
    <>
      <div className="tiles">
        <div className="tile hero">
          <b>{fcfa(s.paiements.revenus_confirmes)}</b>
          <small>Revenus confirmés (GeniusPay)</small>
        </div>
        <div className="tile neutral">
          <b>{fcfa(s.paiements.montant_en_attente)}</b>
          <small>Paiements en attente</small>
        </div>
        <div className="tile green">
          <b>{s.utilisateurs.total}</b>
          <small>Utilisateurs ({s.utilisateurs.mineurs} mineur{s.utilisateurs.mineurs > 1 ? 's' : ''})</small>
        </div>
        <div className="tile green">
          <b>{s.tournois.total}</b>
          <small>Tournois · {s.tournois.promus} promu{s.tournois.promus > 1 ? 's' : ''}</small>
        </div>
        <div className="tile">
          <b>{s.evenements.total}</b>
          <small>Événements · {s.evenements.interesses} intéressés</small>
        </div>
        <div className="tile">
          <b>{s.tournois.equipes}</b>
          <small>Équipes · {s.tournois.participations} participations</small>
        </div>
        <div className="tile neutral">
          <b>{s.marche.offres}</b>
          <small>Offres · {s.marche.disponibles} joueurs sur le marché</small>
        </div>
        <div className="tile neutral">
          <b>{s.paiements.total}</b>
          <small>Transactions ({s.paiements.par_statut?.reussi ?? 0} réussies)</small>
        </div>
      </div>

      <div className="panneaux">
        <div className="panel" style={{ gridColumn: '1 / -1' }}>
          <h3>Revenus confirmés <span className="accent">par mois</span></h3>
          {s.paiements.revenus_par_mois.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Aucun revenu confirmé pour le moment.</p>
          ) : (
            <GraphRevenus mois={s.paiements.revenus_par_mois} />
          )}
        </div>

        <Repartition titre="Utilisateurs" accent="par rôle" donnees={s.utilisateurs.par_role} labels={ROLES} />
        <Repartition titre="Tournois" accent="par statut" donnees={s.tournois.par_statut} labels={STATUTS_TOURNOI} />
        <Repartition titre="Grades" accent="des joueurs" donnees={s.grades} labels={GRADES} ordre={['bronze', 'argent', 'or', 'platine', 'legende']} />
        <Repartition titre="Paiements" accent="par statut" donnees={s.paiements.par_statut} labels={STATUTS_PAIEMENT} />
        <Repartition
          titre="Offres" accent="par statut"
          donnees={offres}
          labels={{ en_attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée' }}
        />
        <div className="panel">
          <h3>Marché <span className="accent">de talents</span></h3>
          <div className="repartition">
            <Ligne nom="Cartes de transfert" nb={s.marche.cartes} max={s.marche.cartes} />
            <Ligne nom="Disponibles" nb={s.marche.disponibles} max={s.marche.cartes} />
            <Ligne nom="Profils vérifiés" nb={s.marche.verifiees} max={s.marche.cartes} />
            <Ligne nom="Recherches recruteurs" nb={s.marche.recherches_recruteurs} max={s.marche.recherches_recruteurs} />
          </div>
        </div>
      </div>
    </>
  )
}

/** Barres mensuelles — mono-série orange, libellé direct sur le max et le dernier mois, tooltip au survol. */
function GraphRevenus({ mois }) {
  const max = Math.max(...mois.map((m) => m.montant), 1)
  const iMax = mois.findIndex((m) => m.montant === max)

  return (
    <>
      <div className="chart" role="img" aria-label="Revenus confirmés par mois">
        {mois.map((m, i) => (
          <div className="col" key={m.mois}>
            <span className="tip">{libelleMois(m.mois)} — {fcfa(m.montant)} · {m.nb} paiement{m.nb > 1 ? 's' : ''}</span>
            {(i === iMax || i === mois.length - 1) && <span className="val">{fcfa(m.montant)}</span>}
            <div className="bar" style={{ height: `${Math.max((m.montant / max) * 100, 2)}%` }} />
            <span className="lbl">{libelleMois(m.mois)}</span>
          </div>
        ))}
      </div>
      <details className="donnees">
        <summary>Voir les données</summary>
        <table>
          <thead><tr><th>Mois</th><th>Paiements</th><th>Montant</th></tr></thead>
          <tbody>
            {mois.map((m) => (
              <tr key={m.mois}><td>{libelleMois(m.mois)}</td><td>{m.nb}</td><td>{fcfa(m.montant)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

const libelleMois = (ym) => MOIS.format(new Date(`${ym}-01T00:00:00`))

function Repartition({ titre, accent, donnees = {}, labels = {}, ordre }) {
  const cles = ordre ?? Object.keys(labels)
  const rows = cles.map((k) => ({ k, nom: labels[k] ?? k, nb: donnees[k] ?? 0 }))
  const max = Math.max(...rows.map((r) => r.nb), 1)
  return (
    <div className="panel">
      <h3>{titre} <span className="accent">{accent}</span></h3>
      <div className="repartition">
        {rows.map((r) => <Ligne key={r.k} nom={r.nom} nb={r.nb} max={max} />)}
      </div>
    </div>
  )
}

function Ligne({ nom, nb, max }) {
  return (
    <div className="rep-row">
      <span className="nom">{nom}</span>
      <span className="barre"><i style={{ width: `${Math.min((nb / Math.max(max, 1)) * 100, 100)}%` }} /></span>
      <span className="nb">{nb}</span>
    </div>
  )
}
