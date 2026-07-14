import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, CircleCheck, ClipboardList, MapPin, Medal, Plus, Settings, Star, Trophy, Users, Wallet } from 'lucide-react'
import { getMesTournois, getTournoi, updateTournoi, saisirResultat } from '../../api/tournaments.js'
import { StatusBadge, Spinner, Empty } from '../../components/ui/bits.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { STATUTS, TARIF_CREATION_TOURNOI, fcfa, fmtDateRange, apiError, unwrap } from '../../lib/constants.js'

export default function DashboardPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [resultatPour, setResultatPour] = useState(null) // id du tournoi en cours de saisie

  const { data, isLoading } = useQuery({
    queryKey: ['mes-tournois'],
    queryFn: () => getMesTournois().then((r) => unwrap(r.data)),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mes-tournois'] })
    qc.invalidateQueries({ queryKey: ['tournois'] })
  }

  const statutMutation = useMutation({
    mutationFn: ({ id, statut }) => updateTournoi(id, { statut }),
    onSuccess: (_, { statut }) => {
      invalidate()
      toast(`Statut mis à jour : ${STATUTS[statut]}`)
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  const tournois = data ?? []
  const totalEquipes = tournois.reduce((s, t) => s + (t.nb_equipes ?? 0), 0)

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <span className="kicker orange">Espace promoteur</span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 32, marginTop: 10 }}>Mes tournois</h1>
        <Link to="/portefeuille" className="btn sm dark" style={{ display: 'inline-flex' }}>
          <span><Wallet size={14} /> Mon portefeuille</span>
        </Link>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 380 }}>
        <div className="stat"><b>{tournois.length}</b><span>Tournois</span></div>
        <div className="stat"><b>{totalEquipes}</b><span>Équipes inscrites</span></div>
      </div>

      {isLoading && <Spinner />}
      {!isLoading && tournois.length === 0 && (
        <Empty icon={<ClipboardList size={44} />}>
          Aucun tournoi pour l'instant.
          <br />
          <Link to="/creer" className="btn mt" style={{ display: 'inline-flex' }}><span>Créer mon premier tournoi</span></Link>
        </Empty>
      )}

      <div className="grid two mt">
        {tournois.map((t) => (
          <article className="t-card" key={t.id} style={{ cursor: 'default' }}>
            <div className="t-body">
              <div className="o-head">
                <b>{t.titre}</b>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {t.mis_en_avant && (
                    <span className="dispo-pill orange"><Star size={10} style={{ verticalAlign: '-1px' }} /> Promu</span>
                  )}
                  <StatusBadge statut={t.statut} />
                </span>
              </div>
              <div className="t-meta">
                <span><MapPin size={13} style={{ verticalAlign: '-2px' }} /> <b>{t.commune}</b></span>
                <span><Calendar size={13} style={{ verticalAlign: '-2px' }} /> <b>{fmtDateRange(t.date_debut, t.date_fin)}</b></span>
                <span><Users size={13} style={{ verticalAlign: '-2px' }} /> <b>{t.nb_equipes ?? 0}</b> équipes</span>
              </div>
              {t.statut === 'en_attente_paiement' ? (
                /* Tournoi invisible du public tant que la publication n'est pas payée */
                <button className="btn sm block" onClick={() => navigate(`/paiement/tournoi/${t.id}`)}>
                  <span><Wallet size={14} /> Payer la publication ({fcfa(TARIF_CREATION_TOURNOI)})</span>
                </button>
              ) : (
                <>
                  <div className="field">
                    <label>Changer le statut</label>
                    <select
                      value={t.statut}
                      onChange={(e) => statutMutation.mutate({ id: t.id, statut: e.target.value })}
                    >
                      {Object.entries(STATUTS)
                        .filter(([k]) => k !== 'a_venir')
                        .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  {!t.mis_en_avant && !['termine', 'annule'].includes(t.statut) && (
                    <button className="btn sm block" onClick={() => navigate(`/paiement/tournoi/${t.id}`)}>
                      <span><Star size={14} /> Promouvoir ce tournoi (5 000 FCFA)</span>
                    </button>
                  )}
                </>
              )}
              <div className="o-actions">
                <button className="btn sm dark" style={{ flex: 1 }} onClick={() => navigate(`/tournois/${t.id}`)}>
                  <span>Voir la fiche</span>
                </button>
                {['en_cours', 'termine'].includes(t.statut) && (
                  <button className="btn sm green" style={{ flex: 1 }} onClick={() => setResultatPour(t.id)}>
                    <span><Trophy size={14} /> Résultats</span>
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="center" style={{ margin: '22px 0' }}>
        <button className="btn" onClick={() => navigate('/creer')}>
          <span><Plus size={16} /> Créer un tournoi</span>
        </button>
      </div>

      {resultatPour && (
        <ResultatModal
          tournoiId={resultatPour}
          onClose={() => setResultatPour(null)}
          onSaved={() => { setResultatPour(null); invalidate() }}
        />
      )}
    </div>
  )
}

function ResultatModal({ tournoiId, onClose, onSaved }) {
  const toast = useToast()
  const [equipeGagnante, setEquipeGagnante] = useState('')
  const [equipeFinaliste, setEquipeFinaliste] = useState('')
  const [scoreGagnante, setScoreGagnante] = useState('')
  const [scoreFinaliste, setScoreFinaliste] = useState('')
  const [mvp, setMvp] = useState('')

  const { data: t, isLoading } = useQuery({
    queryKey: ['tournoi', String(tournoiId)],
    queryFn: () => getTournoi(tournoiId).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: () => saisirResultat(tournoiId, {
      equipe_gagnante: equipeGagnante,
      equipe_finaliste: equipeFinaliste || null,
      score_gagnante: scoreGagnante === '' ? null : Number(scoreGagnante),
      score_finaliste: scoreFinaliste === '' ? null : Number(scoreFinaliste),
      mvp: mvp || null,
    }),
    onSuccess: () => {
      toast('Résultat enregistré — statistiques des joueurs mises à jour !')
      onSaved()
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  const equipes = t?.equipes ?? []
  const membres = equipes.flatMap((e) => (e.membres ?? []).map((m) => ({ ...m, equipe: e.nom })))

  return (
    <Modal title={`Résultats — ${t?.titre ?? ''}`} onClose={onClose}>
      {isLoading ? <Spinner /> : (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            if (equipeGagnante) mutation.mutate()
          }}
        >
          {t?.resultat && (
            <p className="alert" style={{ fontSize: 12.5 }}>
              Un résultat existe déjà ({t.resultat.equipe_gagnante_nom}). Valider le remplacera.
            </p>
          )}
          <div className="field">
            <label><Trophy size={12} style={{ verticalAlign: '-2px' }} /> Équipe gagnante *</label>
            <select value={equipeGagnante} onChange={(e) => setEquipeGagnante(e.target.value)} required>
              <option value="">— Choisir l'équipe —</option>
              {equipes.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Équipe finaliste (battue en finale, optionnel)</label>
            <select value={equipeFinaliste} onChange={(e) => setEquipeFinaliste(e.target.value)}>
              <option value="">— Aucune —</option>
              {equipes.filter((e) => String(e.id) !== String(equipeGagnante)).map((e) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          </div>
          <div className="row2">
            <div className="field">
              <label>Score gagnante</label>
              <input
                type="number" min="0" max="300" placeholder="21"
                value={scoreGagnante} onChange={(e) => setScoreGagnante(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Score finaliste</label>
              <input
                type="number" min="0" max="300" placeholder="15"
                value={scoreFinaliste} onChange={(e) => setScoreFinaliste(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label><Medal size={12} style={{ verticalAlign: '-2px' }} /> MVP du tournoi (optionnel)</label>
            <select value={mvp} onChange={(e) => setMvp(e.target.value)}>
              <option value="">— Aucun —</option>
              {membres.map((m) => (
                <option key={m.id} value={m.id}>{m.nom} ({m.equipe})</option>
              ))}
            </select>
            {membres.length === 0 && (
              <p className="err" style={{ color: 'var(--muted)' }}>
                Aucun joueur inscrit dans les équipes — le MVP ne peut pas être désigné.
              </p>
            )}
          </div>
          <p className="alert green" style={{ fontSize: 12.5 }}>
            <Settings size={13} style={{ verticalAlign: '-2px' }} /> À la validation, le tournoi passe en « Terminé » et les statistiques (tournois joués,
            victoires, taux de victoire, MVP) de tous les participants sont recalculées automatiquement.
          </p>
          <button className="btn block green" type="submit" disabled={!equipeGagnante || mutation.isPending}>
            <span>{mutation.isPending ? 'Enregistrement…' : <><CircleCheck size={16} /> Valider le résultat</>}</span>
          </button>
        </form>
      )}
    </Modal>
  )
}
