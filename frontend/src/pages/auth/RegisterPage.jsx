import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { Megaphone, Volleyball, UserRoundSearch, ShieldAlert } from 'lucide-react'
import { register as apiRegister, login as apiLogin, getMe } from '../../api/auth.js'
import { updateMonProfil } from '../../api/players.js'
import { useAuthStore } from '../../store/authStore.js'
import { useToast } from '../../components/ui/Toast.jsx'
import { SPORTS, apiError } from '../../lib/constants.js'

// Les 3 rôles proposés à l'inscription (mêmes valeurs que le backend)
const ROLE_CARDS = [
  { value: 'promoteur', icon: <Megaphone size={26} />, label: 'Promoteur', desc: 'Je publie tournois & événements' },
  { value: 'joueur', icon: <Volleyball size={26} />, label: 'Joueur', desc: 'Je joue et me montre' },
  { value: 'client', icon: <UserRoundSearch size={26} />, label: 'Fan / Recruteur', desc: 'Je cherche des talents' },
]

const ageDe = (dateNaissance) => {
  if (!dateNaissance) return null
  return (Date.now() - new Date(dateNaissance).getTime()) / 3.15576e10
}

// Solidité du mot de passe : longueur + variété de caractères (minuscules,
// majuscules, chiffres, symboles). Indicatif — le backend revalide (validate_password)
const solidite = (mdp) => {
  let variete = 0
  if (/[a-z]/.test(mdp)) variete++
  if (/[A-Z]/.test(mdp)) variete++
  if (/\d/.test(mdp)) variete++
  if (/[^a-zA-Z0-9]/.test(mdp)) variete++
  if (mdp.length >= 12 && variete >= 3) return { niveau: 3, label: 'Solide', couleur: 'var(--green)' }
  if (mdp.length >= 8 && variete >= 2) return { niveau: 2, label: 'Moyen', couleur: 'var(--orange)' }
  return { niveau: 1, label: 'Faible', couleur: 'var(--red)' }
}

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError } = useForm()
  const [role, setRole] = useState('joueur')
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const toast = useToast()

  const dateNaissance = watch('date_naissance')
  const estMineur = role === 'joueur' && dateNaissance && ageDe(dateNaissance) < 18
  const motDePasse = watch('password') || ''
  const force = solidite(motDePasse)

  const onSubmit = async (data) => {
    try {
      // Inscription minimale — nom, commune, téléphone, photo se complètent
      // ensuite dans « Mon profil » (le backend génère le username depuis l'e-mail)
      const payload = {
        email: data.email,
        password: data.password,
        role,
        is_minor: Boolean(estMineur),
      }
      await apiRegister(payload)
      const { data: tokens } = await apiLogin(data.email, data.password)
      useAuthStore.getState().setTokens(tokens.access, tokens.refresh)
      const { data: user } = await getMe()
      login(user, tokens.access, tokens.refresh)
      // Compléter le profil joueur (créé par signal côté backend) :
      // date de naissance + sport pratiqué (basket ou football)
      if (role === 'joueur') {
        try {
          await updateMonProfil({
            date_naissance: data.date_naissance || null,
            sport: data.sport || 'basket',
          })
        } catch { /* non bloquant : modifiable ensuite depuis le profil */ }
      }
      toast('Bienvenue sur HoopCI !')
      navigate(
        role === 'promoteur' ? '/creer'
          : role === 'joueur' ? '/profil' : '/',
      )
    } catch (err) {
      const detail = err.response?.data
      if (detail?.email) setError('email', { message: detail.email[0] })
      else if (detail?.password) setError('password', { message: detail.password[0] })
      else setError('root', { message: apiError(err) })
    }
  }

  return (
    <div className="form-page">
      <div className="center mb">
        <img src="/logo.png" alt="HoopCI" style={{ height: 110 }} />
        <h1 style={{ fontSize: 28, marginTop: 12 }}>
          Rejoins <span style={{ color: 'var(--orange)' }}>Hoop</span><span style={{ color: 'var(--green)' }}>CI</span>
        </h1>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          30 secondes chrono — tu pourras compléter ton profil (nom, photo, commune…) plus tard.
        </p>
      </div>

      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <div className="field">
          <label>Je suis…</label>
          <div className="role-cards">
            {ROLE_CARDS.map((r) => (
              <div
                key={r.value}
                className={`role-card ${role === r.value ? 'active' : ''}`}
                onClick={() => setRole(r.value)}
                role="radio"
                aria-checked={role === r.value}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setRole(r.value)}
              >
                <span className="ic">{r.icon}</span>
                <b>{r.label}</b>
                <p>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label>E-mail *</label>
          <input type="email" autoComplete="email" {...register('email', { required: 'E-mail requis' })} placeholder="toi@exemple.ci" />
          {errors.email && <p className="err">{errors.email.message}</p>}
        </div>

        {role === 'joueur' && (
          <div className="row2">
            {/* Le sport choisi alimente le profil joueur (postes et tournois recommandés) */}
            <div className="field">
              <label>Mon sport *</label>
              <select {...register('sport')} defaultValue="basket">
                {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Date de naissance *</label>
              <input type="date" {...register('date_naissance', { required: role === 'joueur' ? 'Requise pour les joueurs' : false })} />
              {errors.date_naissance && <p className="err">{errors.date_naissance.message}</p>}
            </div>
          </div>
        )}

        {estMineur && (
          <>
            <div className="alert">
              <ShieldAlert size={15} style={{ verticalAlign: '-3px' }} /> <b>Tu as moins de 18 ans.</b> Ton profil sera protégé : photo et identité complète
              masquées publiquement tant que le consentement d'un parent ou tuteur n'est pas confirmé.
            </div>
            <label className="check">
              <input type="checkbox" {...register('consentement', { required: estMineur ? 'Requis pour les mineurs' : false })} />
              Mon parent / tuteur est informé de mon inscription sur HoopCI.
            </label>
            {errors.consentement && <p className="err" style={{ color: 'var(--red)', fontSize: 12.5 }}>{errors.consentement.message}</p>}
          </>
        )}

        <div className="row2">
          <div className="field">
            <label>Mot de passe *</label>
            <input
              type="password"
              autoComplete="new-password"
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: { value: 8, message: 'Minimum 8 caractères' },
                validate: (v) => !/^\d+$/.test(v) || 'Uniquement des chiffres : trop facile à deviner',
              })}
              placeholder="8 caractères minimum"
            />
            {errors.password && <p className="err">{errors.password.message}</p>}
          </div>
          <div className="field">
            <label>Confirmation *</label>
            <input
              type="password"
              autoComplete="new-password"
              {...register('password2', {
                required: 'Confirmation requise',
                validate: (v) => v === motDePasse || 'Les mots de passe ne correspondent pas',
              })}
              placeholder="Retape le mot de passe"
            />
            {errors.password2 && <p className="err">{errors.password2.message}</p>}
          </div>
        </div>

        {/* Jauge de solidité, visible dès la première frappe */}
        {motDePasse && (
          <div style={{ marginTop: -6 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3].map((n) => (
                <i
                  key={n}
                  style={{ flex: 1, height: 4, borderRadius: 2, background: n <= force.niveau ? force.couleur : 'rgba(127,127,127,.25)' }}
                />
              ))}
            </div>
            <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
              Solidité : <b style={{ color: force.couleur }}>{force.label}</b>
              {force.niveau < 3 && ' — ajoute des majuscules, chiffres ou symboles pour renforcer'}
            </p>
          </div>
        )}

        <label className="check">
          <input type="checkbox" {...register('cgu', { required: 'Tu dois accepter les CGU' })} />
          <span>
            J'accepte les CGU et la politique de confidentialité, et je consens au traitement de mes
            données (loi ivoirienne n° 2013-450 / ARTCI).
          </span>
        </label>
        {errors.cgu && <p className="err" style={{ color: 'var(--red)', fontSize: 12.5 }}>{errors.cgu.message}</p>}

        {errors.root && <p className="alert red">{errors.root.message}</p>}

        <button className="btn block" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? 'Création…' : 'Créer mon compte'}</span>
        </button>
      </form>

      <p className="center muted mt" style={{ fontSize: 13.5 }}>
        Déjà inscrit ? <Link to="/login" style={{ color: 'var(--orange)', fontWeight: 600 }}>Se connecter</Link>
      </p>
    </div>
  )
}
