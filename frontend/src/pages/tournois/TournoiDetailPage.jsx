import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, MapPin, Medal, Phone, Star, Trophy, UserPlus, Users, Wallet, TriangleAlert } from 'lucide-react'
import { getTournoi, toggleFavori, inscrireEquipe, rejoindreEquipe } from '../../api/tournaments.js'
import { StatusBadge, Spinner, Empty, Avatar } from '../../components/ui/bits.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { NIVEAUX, FORMAT_LABELS, CATEGORIES_AGE, MEMBRES_MIN_PAR_FORMAT, TARIF_INSCRIPTION_EQUIPE, fcfa, fmtDateRange, gradFor, apiError } from '../../lib/constants.js'

/**
 * Fiche publique d'un tournoi : infos, équipes, résultat, favori,
 * inscription d'équipe (joueur) et contact du promoteur.
 */
export default function TournoiDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [showInscription, setShowInscription] = useState(false)
  const [nomEquipe, setNomEquipe] = useState('')
  const [coequipiers, setCoequipiers] = useState([''])

  const { data: t, isLoading, isError } = useQuery({
    queryKey: ['tournoi', id],
    queryFn: () => getTournoi(id).then((r) => r.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tournoi', id] })
    qc.invalidateQueries({ queryKey: ['tournois'] })
    qc.invalidateQueries({ queryKey: ['favoris'] })
  }

  const favMutation = useMutation({
    mutationFn: () => toggleFavori(id),
    onSuccess: ({ data }) => {
      invalidate()
      toast(data.favori ? 'Ajouté aux favoris' : 'Retiré des favoris', data.favori ? 'success' : 'info')
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  const inscriptionMutation = useMutation({
    mutationFn: () => inscrireEquipe(id, nomEquipe.trim(), coequipiers.map((e) => e.trim()).filter(Boolean)),
    onSuccess: ({ data: eq }) => {
      invalidate()
      setShowInscription(false)
      setNomEquipe('')
      setCoequipiers([''])
      if (eq.payee) {
        // Équipe ajoutée par le promoteur du tournoi : exemptée de frais
        toast('Équipe inscrite au tournoi !')
      } else {
        toast("Équipe créée — règle l'inscription pour la valider.")
        navigate(`/paiement/equipe/${eq.id}`)
      }
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  const rejoindreMutation = useMutation({
    mutationFn: (equipeId) => rejoindreEquipe(id, equipeId),
    onSuccess: () => {
      invalidate()
      toast('Tu as rejoint l’équipe !')
    },
    onError: (e) => toast(apiError(e), 'error'),
  })

  if (isLoading) return <Spinner />
  if (isError || !t) return <Empty icon={<TriangleAlert size={44} />}>Tournoi introuvable.</Empty>

  const hasImg = Boolean(t.affiche)
  const nbEquipes = t.equipes?.length ?? 0
  const pct = t.nombre_equipes_max ? Math.min(Math.round((nbEquipes / t.nombre_equipes_max) * 100), 100) : 0
  const mapsUrl = t.latitude && t.longitude
    ? `https://www.google.com/maps?q=${t.latitude},${t.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${t.lieu} ${t.commune} Abidjan`)}`
  const telephone = t.contact || t.organisateur?.telephone
  const estJoueur = user?.role === 'joueur'
  // Effectif exigé par le format (le capitaine joueur compte pour un)
  const minRequis = MEMBRES_MIN_PAR_FORMAT[t.format] || 0
  const slotsCoequipiers = Math.max(0, minRequis - (estJoueur ? 1 : 0))

  return (
    <>
      <div
        className={`detail-cover ${hasImg ? 'has-img' : gradFor(t.id)}`}
        style={hasImg ? { backgroundImage: `url(${t.affiche})` } : undefined}
      >
        <div className="wrap">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft size={18} />
          </button>
          <div className="badge-row" style={{ marginBottom: 8 }}>
            <StatusBadge statut={t.statut} />
            {/* Sport + format lisible (Maracana, 3x3, 7 vs 7…) */}
            <span className="fmt" style={{ background: 'rgba(0,0,0,.4)', color: '#fff', borderColor: '#fff' }}>
              {t.sport === 'football' ? 'Football' : 'Basket'} · {FORMAT_LABELS[t.format] || t.format}
            </span>
            {t.categorie_age && t.categorie_age !== 'open' && (
              <span className="fmt" style={{ background: 'rgba(0,0,0,.4)', color: '#fff', borderColor: '#fff' }}>
                {CATEGORIES_AGE[t.categorie_age] || t.categorie_age}
              </span>
            )}
          </div>
          <h1>{t.titre}</h1>
        </div>
      </div>

      <div className="wrap">
        <div className="info-grid">
          <div className="info-tile">
            <div className="lbl"><Calendar size={11} style={{ verticalAlign: '-1px' }} /> Dates</div>
            <div className="val">{fmtDateRange(t.date_debut, t.date_fin)}</div>
          </div>
          <div className="info-tile">
            <div className="lbl"><MapPin size={11} style={{ verticalAlign: '-1px' }} /> Commune</div>
            <div className="val">{t.commune}</div>
          </div>
          <div className="info-tile">
            <div className="lbl"><Medal size={11} style={{ verticalAlign: '-1px' }} /> Niveau</div>
            <div className="val">{NIVEAUX[t.niveau] || t.niveau}</div>
          </div>
          <div className="info-tile">
            <div className="lbl"><Wallet size={11} style={{ verticalAlign: '-1px' }} /> Frais / équipe</div>
            <div className="val" style={{ color: 'var(--orange)' }}>{fcfa(t.frais_inscription)}</div>
          </div>
        </div>

        <div className="detail-layout">
          <div>
            {t.description && (
              <div className="panel">
                <h3>À propos</h3>
                <p className="txt-soft" style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{t.description}</p>
              </div>
            )}

            <div className="panel">
              <h3>Équipes {t.nombre_equipes_max ? `(${nbEquipes}/${t.nombre_equipes_max})` : `(${nbEquipes})`}</h3>
              {t.nombre_equipes_max > 0 && (
                <div className="progress" style={{ marginBottom: 10 }}><i style={{ width: `${pct}%` }} /></div>
              )}
              {nbEquipes === 0 && <p className="muted" style={{ fontSize: 13 }}>Aucune équipe inscrite pour l'instant. Sois la première !</p>}
              {t.equipes?.map((e, i) => (
                <div className="rank-row" key={e.id}>
                  <div className="rank-num"><span>{i + 1}</span></div>
                  <b style={{ fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 16, textTransform: 'uppercase', flex: 1 }}>
                    {e.nom}
                  </b>
                  <span className="muted" style={{ fontSize: 12 }}>{e.membres?.length ?? 0} joueur{(e.membres?.length ?? 0) > 1 ? 's' : ''}</span>
                  {estJoueur && ['ouvert', 'complet'].includes(t.statut) && !e.membres?.some((m) => m.id === user.id) && (
                    <button className="btn sm dark" onClick={(ev) => { ev.stopPropagation(); rejoindreMutation.mutate(e.id) }}>
                      <span><UserPlus size={13} /> Rejoindre</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {t.resultat && (
              <div className="panel">
                <h3><Trophy size={16} style={{ verticalAlign: '-2px' }} /> Résultat final</h3>
                <div className="rank-row rank-1">
                  <div className="rank-num"><span>1</span></div>
                  <b style={{ fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 17, textTransform: 'uppercase' }}>
                    {t.resultat.equipe_gagnante_nom || 'Équipe gagnante'}
                  </b>
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {t.resultat.score_gagnante != null && (
                      <b className="score-finale">{t.resultat.score_gagnante}</b>
                    )}
                    <span style={{ color: 'var(--yellow)' }}><Medal size={20} /></span>
                  </span>
                </div>
                {t.resultat.equipe_finaliste_nom && (
                  <div className="rank-row">
                    <div className="rank-num"><span>2</span></div>
                    <b style={{ fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 16, textTransform: 'uppercase', color: 'var(--txt2)' }}>
                      {t.resultat.equipe_finaliste_nom}
                    </b>
                    {t.resultat.score_finaliste != null && (
                      <b className="score-finale muted" style={{ marginLeft: 'auto' }}>{t.resultat.score_finaliste}</b>
                    )}
                  </div>
                )}
                {t.resultat.mvp_nom && (
                  <div className="mvp-band">
                    <Avatar nom={t.resultat.mvp_nom} style={{ width: 44, height: 44 }} />
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--orange)', fontWeight: 700 }}>
                        MVP du tournoi
                      </div>
                      <b style={{ fontFamily: 'var(--cond)', fontStyle: 'italic', fontSize: 18, textTransform: 'uppercase' }}>
                        {t.resultat.mvp_nom}
                      </b>
                    </div>
                    {t.resultat.mvp && (
                      <button className="btn sm dark" style={{ marginLeft: 'auto' }} onClick={() => navigate(`/joueurs/${t.resultat.mvp}`)}>
                        <span>Profil</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="panel">
              <h3 className="green">Lieu</h3>
              <p style={{ fontSize: 13.5 }}>
                <MapPin size={14} style={{ verticalAlign: '-2px' }} /> {t.lieu}, {t.commune}
              </p>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn sm dark mt" style={{ display: 'inline-flex' }}>
                <span>Ouvrir dans Maps</span>
              </a>
            </div>

            <div className="panel">
              <h3>Promoteur</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar photo={t.organisateur?.photo} nom={t.organisateur?.nom_complet} className="grn" />
                <div style={{ flex: 1 }}>
                  <b>{t.organisateur?.nom_complet}</b>
                  {telephone && <div className="muted" style={{ fontSize: 12 }}>{telephone}</div>}
                </div>
              </div>
              {telephone && (
                <a href={`tel:${telephone}`} className="btn sm green mt" style={{ display: 'inline-flex' }}>
                  <span><Phone size={14} /> Contacter</span>
                </a>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {t.statut === 'ouvert' && (
                <button
                  className="btn block"
                  onClick={() => {
                    if (!user) { navigate('/login'); return }
                    // Prépare autant de champs coéquipiers que le format l'exige
                    // (le capitaine joueur compte pour un)
                    setCoequipiers(Array(Math.max(1, slotsCoequipiers)).fill(''))
                    setShowInscription(true)
                  }}
                >
                  <span><UserPlus size={16} /> Inscrire mon équipe</span>
                </button>
              )}
              {t.statut === 'complet' && (
                <button className="btn block dark" disabled><span>Tournoi complet</span></button>
              )}
              <button
                className={`btn block ${t.is_favori ? 'dark' : 'green'}`}
                onClick={() => (user ? favMutation.mutate() : navigate('/login'))}
                disabled={favMutation.isPending}
              >
                <span><Star size={16} /> {t.is_favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showInscription && (
        <Modal title="Inscrire mon équipe" onClose={() => setShowInscription(false)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              if (nomEquipe.trim()) inscriptionMutation.mutate()
            }}
          >
            <div className="field">
              <label>Nom de l'équipe</label>
              <input
                value={nomEquipe}
                onChange={(e) => setNomEquipe(e.target.value)}
                placeholder="Ex. Yop City Warriors"
                autoFocus
                required
              />
            </div>

            <p className="alert" style={{ fontSize: 12.5 }}>
              <Users size={13} style={{ verticalAlign: '-2px' }} /> Ce tournoi se joue en{' '}
              <b>{FORMAT_LABELS[t.format] || t.format}</b> — <b>{minRequis} joueurs</b> minimum,
              tous inscrits sur HoopCI.
            </p>

            {estJoueur && (
              <p className="alert green" style={{ fontSize: 12.5 }}>
                Tu es le capitaine — déjà compté comme premier joueur. Renseigne l'e-mail de tes coéquipiers.
              </p>
            )}

            {/* Effectif : un e-mail de compte HoopCI par coéquipier */}
            <div className="field">
              <label>Coéquipiers (e-mail de leur compte HoopCI)</label>
              {coequipiers.map((email, idx) => (
                <input
                  key={idx}
                  type="email"
                  value={email}
                  onChange={(e) => setCoequipiers((arr) => arr.map((v, i) => (i === idx ? e.target.value : v)))}
                  placeholder={`Coéquipier ${idx + 1} — email@exemple.ci`}
                  required={idx < slotsCoequipiers}
                  style={{ marginBottom: 6 }}
                />
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn sm dark" onClick={() => setCoequipiers((a) => [...a, ''])}>
                  <span>+ Ajouter un remplaçant</span>
                </button>
                {coequipiers.length > slotsCoequipiers && (
                  <button type="button" className="btn sm dark" onClick={() => setCoequipiers((a) => a.slice(0, -1))}>
                    <span>− Retirer</span>
                  </button>
                )}
              </div>
              <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                Chaque coéquipier doit déjà avoir créé son compte sur HoopCI. Un joueur non inscrit bloque la validation.
              </p>
            </div>

            {user?.id !== t.organisateur?.id && (
              <p className="muted" style={{ fontSize: 12 }}>
                Inscription : {fcfa(TARIF_INSCRIPTION_EQUIPE)} (frais de plateforme)
                {Number(t.frais_inscription) > 0 && <> + {fcfa(t.frais_inscription)} (frais du tournoi)</>}
                {' '}= <b>{fcfa(TARIF_INSCRIPTION_EQUIPE + Number(t.frais_inscription || 0))}</b>,
                payable à l'étape suivante. L'équipe apparaît après confirmation du paiement.
              </p>
            )}
            <button className="btn block" type="submit" disabled={inscriptionMutation.isPending}>
              <span>{inscriptionMutation.isPending ? 'Inscription…' : 'Valider l’inscription'}</span>
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
