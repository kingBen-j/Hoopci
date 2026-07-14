import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { login as apiLogin, getMe } from '../../api/auth.js'
import { useAuthStore } from '../../store/authStore.js'
import { useToast } from '../../components/ui/Toast.jsx'

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const toast = useToast()

  const onSubmit = async (data) => {
    try {
      const { data: tokens } = await apiLogin(data.email, data.password)
      useAuthStore.getState().setTokens(tokens.access, tokens.refresh)
      const { data: user } = await getMe()
      login(user, tokens.access, tokens.refresh)
      toast(`Bienvenue, ${user.first_name || user.nom_complet} !`)
      navigate('/')
    } catch {
      setError('root', { message: 'E-mail ou mot de passe incorrect.' })
    }
  }

  return (
    <div className="form-page">
      <div className="center mb">
        <img src="/logo.png" alt="HoopCI" style={{ height: 130 }} />
        <h1 style={{ fontSize: 30, marginTop: 12 }}>
          Bienvenue sur <span style={{ color: 'var(--orange)' }}>Hoop</span><span style={{ color: 'var(--green)' }}>CI</span>
        </h1>
        <p className="muted" style={{ fontSize: 13 }}>Là où l'on trouve les tournois, où l'on prouve son talent.</p>
      </div>

      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <div className="field">
          <label>E-mail</label>
          <input type="email" autoComplete="email" {...register('email', { required: 'E-mail requis' })} placeholder="toi@exemple.ci" />
          {errors.email && <p className="err">{errors.email.message}</p>}
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" autoComplete="current-password" {...register('password', { required: 'Mot de passe requis' })} placeholder="••••••••" />
          {errors.password && <p className="err">{errors.password.message}</p>}
        </div>
        {errors.root && <p className="alert red">{errors.root.message}</p>}
        <button className="btn block" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? 'Connexion…' : 'Se connecter'}</span>
        </button>
      </form>

      <p className="center muted mt" style={{ fontSize: 13.5 }}>
        Pas encore de compte ?{' '}
        <Link to="/register" style={{ color: 'var(--orange)', fontWeight: 600 }}>Rejoindre HoopCI</Link>
      </p>
    </div>
  )
}
