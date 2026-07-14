import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { LogOut, CircleDot, Shield, Star } from 'lucide-react'
import { getMe, updateMe } from '../api/auth.js'
import { getMonProfil, updateMonProfil } from '../api/players.js'
import { getMaCarte, updateCarte } from '../api/market.js'
import { initierPromotionCompte, simulerPaiement } from '../api/payments.js'
import { Spinner, Avatar } from '../components/ui/bits.jsx'
import GradeBadge, { GradeProgress } from '../components/joueurs/GradeBadge.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useSportStore } from '../store/sportStore.js'
import { COMMUNES, SPORTS, POSTES_PAR_SPORT, ROLES, TARIF_PROMOTION_COMPTE, fcfa, apiError } from '../lib/constants.js'

/**
 * Page « Mon profil » : compte (tous rôles) + stats, profil joueur
 * et carte de transfert (joueurs uniquement).
 */
export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const estJoueur = user?.role === 'joueur'

  if (!user) return <Spinner />

  return (
    <div className="wrap" style={{ paddingTop: 24, maxWidth: 720 }}> 
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Avatar photo={user.photo} nom={user.nom_complet || user.email} className="lg" />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 30 }}>{user.nom_complet || user.email}</h1>
          <span className="kicker orange" style={{ marginTop: 6 }}>{ROLES[user.role] || user.role}</span>
        </div>
        <button
          className="btn sm ghost-red"
          onClick={() => { logout(); navigate('/'); toast('À bientôt sur HoopCI !', 'info') }}
        >
          <span><LogOut size={14} /> Déconnexion</span>
        </button>
      </div>

      {estJoueur && <MesStats />}
      {estJoueur && (
        <p style={{ marginTop: 10 }}>
          <Link to="/mes-equipes" className="btn sm dark" style={{ display: 'inline-flex' }}>
            <span><Shield size={14} /> Gérer mes équipes</span>
          </Link>
        </p>
      )}
      <CompteForm user={user} setUser={setUser} toast={toast} />
      {user.role === 'client' && <PreferencesRecruteur />}
      {estJoueur && <ProfilJoueurForm toast={toast} />}
      {estJoueur && <CarteTransfertForm toast={toast} />}
    </div>
  )
}

function MesStats() {
  const { data: p } = useQuery({
    queryKey: ['mon-profil'],
    queryFn: () => getMonProfil().then((r) => r.data),
  })
  if (!p) return null
  return (
    <>
      <div className="stats-row">
        <div className="stat"><b>{p.tournois_joues}</b><span>Joués</span></div>
        <div className="stat"><b>{p.tournois_gagnes}</b><span>Gagnés</span></div>
        <div className="stat"><b>{Math.round(p.taux_victoire)}%</b><span>Victoires</span></div>
        <div className="stat"><b>{p.mvp_count}</b><span>MVP</span></div>
      </div>
      <p className="muted" style={{ fontSize: 11.5, marginBottom: 6 }}>
        Tes statistiques se mettent à jour automatiquement quand les promoteurs saisissent les résultats.
      </p>
      <div className="panel mt">
        <h3>Mon grade <GradeBadge grade={p.grade} /></h3>
        <GradeProgress joueur={p} />
      </div>
    </>
  )
}

function CompteForm({ user, setUser, toast }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      commune: user.commune,
      telephone: user.telephone,
    },
  })

  const onSubmit = async (data) => {
    try {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'photo') {
          if (v?.[0]) fd.append('photo', v[0])
        } else {
          fd.append(k, v ?? '')
        }
      })
      await updateMe(fd)
      const { data: fresh } = await getMe()
      setUser(fresh)
      toast('Compte mis à jour')
    } catch (e) {
      toast(apiError(e), 'error')
    }
  }

  return (
    <div className="panel mt">
      <h3>Mon compte</h3>
      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <div className="row2">
          <div className="field"><label>Prénom</label><input {...register('first_name')} /></div>
          <div className="field"><label>Nom</label><input {...register('last_name')} /></div>
        </div>
        <div className="row2">
          <div className="field">
            <label>Commune</label>
            <select {...register('commune')}>
              <option value="">— Choisir —</option>
              {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>Téléphone</label><input {...register('telephone')} placeholder="+225 …" /></div>
        </div>
        <div className="field">
          <label>Photo de profil</label>
          <input type="file" accept="image/*" {...register('photo')} />
        </div>
        <button className="btn sm" type="submit" disabled={isSubmitting} style={{ alignSelf: 'flex-start' }}>
          <span>{isSubmitting ? 'Enregistrement…' : 'Enregistrer'}</span>
        </button>
      </form>
    </div>
  )
}

/** Choix du recruteur : voir plutôt les basketteurs ou les footballeurs. */
function PreferencesRecruteur() {
  const sportPrefere = useSportStore((s) => s.sportPrefere)
  const setSportPrefere = useSportStore((s) => s.setSportPrefere)
  return (
    <div className="panel mt">
      <h3>Mes préférences</h3>
      <div className="field">
        <label>Je m'intéresse aux</label>
        <select value={sportPrefere} onChange={(e) => setSportPrefere(e.target.value)}>
          <option value="">Basketteurs et footballeurs</option>
          <option value="basket">Basketteurs</option>
          <option value="football">Footballeurs</option>
        </select>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        Les pages tournois, événements et joueurs proposeront ce sport en premier — le filtre reste modifiable sur chaque page.
      </p>
    </div>
  )
}

/** Formulaire du profil sportif : sport, poste (dépend du sport), taille, bio. */
function ProfilJoueurForm({ toast }) {
  const qc = useQueryClient()
  const { data: p, isLoading } = useQuery({
    queryKey: ['mon-profil'],
    queryFn: () => getMonProfil().then((r) => r.data),
  })
  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({
    values: p ? { sport: p.sport || 'basket', poste: p.poste || '', taille: p.taille || '', bio: p.bio || '' } : undefined,
  })
  // Le sport choisi détermine la liste des postes proposés
  const sport = watch('sport') || 'basket'

  const onSubmit = async (data) => {
    try {
      await updateMonProfil({ ...data, taille: data.taille || null })
      qc.invalidateQueries({ queryKey: ['mon-profil'] })
      // Le contenu proposé (tournois, événements, joueurs) suit le nouveau sport
      useSportStore.getState().setSportPrefere(data.sport)
      toast('Profil joueur mis à jour')
    } catch (e) {
      toast(apiError(e), 'error')
    }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="panel">
      <h3 className="green">Mon profil joueur</h3>
      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <div className="row2">
          <div className="field">
            <label>Sport</label>
            {/* Changer de sport efface le poste (les postes ne sont pas les mêmes) */}
            <select
              {...register('sport')}
              onChange={(e) => { setValue('sport', e.target.value); setValue('poste', '') }}
            >
              {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Poste</label>
            <select {...register('poste')}>
              <option value="">— Choisir —</option>
              {Object.entries(POSTES_PAR_SPORT[sport] || {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Taille (cm)</label><input type="number" min="120" max="240" {...register('taille')} /></div>
        <div className="field">
          <label>Bio (visible publiquement)</label>
          <textarea {...register('bio')} placeholder="Ton style de jeu, ton expérience, ce que tu cherches…" />
        </div>
        <button className="btn sm green" type="submit" disabled={isSubmitting} style={{ alignSelf: 'flex-start' }}>
          <span>{isSubmitting ? 'Enregistrement…' : 'Enregistrer'}</span>
        </button>
      </form>
    </div>
  )
}

function CarteTransfertForm({ toast }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: carte, isLoading } = useQuery({
    queryKey: ['ma-carte'],
    queryFn: () => getMaCarte().then((r) => r.data),
  })

  // Promotion du compte : checkout GeniusPay (ou simulation en dev sans clés)
  const promotion = useMutation({
    mutationFn: () => initierPromotionCompte().then((r) => r.data),
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
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    values: carte
      ? { disponible: carte.disponible, description: carte.description || '', pretentions: carte.pretentions || '' }
      : undefined,
  })
  const disponible = watch('disponible')

  const onSubmit = async (data) => {
    try {
      await updateCarte(data)
      qc.invalidateQueries({ queryKey: ['ma-carte'] })
      qc.invalidateQueries({ queryKey: ['cartes'] })
      toast(data.disponible ? 'Tu es visible sur le marché de talents !' : 'Carte désactivée', 'success')
    } catch (e) {
      toast(apiError(e), 'error')
    }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="panel">
      <h3>Ma carte de transfert</h3>
      <p className="muted mb" style={{ fontSize: 12.5 }}>
        Active ta carte pour apparaître dans l'annuaire des joueurs disponibles et recevoir des offres.
      </p>
      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <label className="switch">
          <input type="checkbox" {...register('disponible')} />
          <b style={{ fontFamily: 'var(--cond)', fontStyle: 'italic', textTransform: 'uppercase', fontSize: 16, color: disponible ? 'var(--green)' : 'var(--muted)' }}>
            {disponible ? <><CircleDot size={14} style={{ verticalAlign: '-2px' }} /> Disponible sur le marché</> : 'Indisponible'}
          </b>
        </label>
        <div className="field">
          <label>Ce que je recherche</label>
          <textarea {...register('description')} placeholder="Ex. Je cherche une équipe sérieuse pour les tournois 3x3 d'Abidjan…" />
        </div>
        <div className="field">
          <label>Mes prétentions</label>
          <input {...register('pretentions')} placeholder="Ex. Défraiement transport, niveau élite, zone Yopougon/Cocody" />
        </div>
        <button className="btn sm" type="submit" disabled={isSubmitting} style={{ alignSelf: 'flex-start' }}>
          <span>{isSubmitting ? 'Enregistrement…' : 'Enregistrer ma carte'}</span>
        </button>
      </form>

      {/* Promotion du compte : visibilité marché + gains de grade boostés */}
      {carte?.mise_en_avant_active ? (
        <p className="alert green" style={{ fontSize: 12.5, marginTop: 12 }}>
          <Star size={13} style={{ verticalAlign: '-2px' }} /> <b>Compte promu</b> — ta carte est en tête du
          marché et tes gains de points de grade sont boostés (×1,15).
        </p>
      ) : (
        <>
          <button className="btn sm block" style={{ marginTop: 12 }} onClick={() => promotion.mutate()} disabled={promotion.isPending}>
            <span><Star size={14} /> Promouvoir mon compte ({fcfa(TARIF_PROMOTION_COMPTE)} / 30 jours)</span>
          </button>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
            Carte en tête du marché de talents + points de grade ×1,15 sur tes tournois.
          </p>
        </>
      )}
    </div>
  )
}
