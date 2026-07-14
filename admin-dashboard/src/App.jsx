import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Wallet, Users, Trophy, CalendarRange, BadgeCheck, LogOut,
  Shield, Mail, Medal,
} from 'lucide-react'
import api, { API_URL, getTokens, setTokens, clearTokens, apiError } from './api.js'
import { Spinner } from './ui.jsx'
import OverviewView from './views/OverviewView.jsx'
import PaiementsView from './views/PaiementsView.jsx'
import UtilisateursView from './views/UtilisateursView.jsx'
import TournoisView from './views/TournoisView.jsx'
import EvenementsView from './views/EvenementsView.jsx'
import CartesView from './views/CartesView.jsx'
import EquipesView from './views/EquipesView.jsx'
import OffresView from './views/OffresView.jsx'
import JoueursView from './views/JoueursView.jsx'

const ONGLETS = [
  { id: 'apercu', label: "Vue d'ensemble", icon: LayoutDashboard, vue: OverviewView },
  { id: 'paiements', label: 'Paiements', icon: Wallet, vue: PaiementsView },
  { id: 'utilisateurs', label: 'Utilisateurs', icon: Users, vue: UtilisateursView },
  { id: 'tournois', label: 'Tournois', icon: Trophy, vue: TournoisView },
  { id: 'equipes', label: 'Équipes', icon: Shield, vue: EquipesView },
  { id: 'joueurs', label: 'Joueurs', icon: Medal, vue: JoueursView },
  { id: 'evenements', label: 'Événements', icon: CalendarRange, vue: EvenementsView },
  { id: 'marche', label: 'Marché', icon: BadgeCheck, vue: CartesView },
  { id: 'offres', label: 'Offres', icon: Mail, vue: OffresView },
]

const ongletInitial = () => {
  const hash = window.location.hash.replace('#', '')
  return ONGLETS.some((o) => o.id === hash) ? hash : 'apercu'
}

export default function App() {
  const [user, setUser] = useState(null)
  const [pret, setPret] = useState(false)
  const [onglet, setOnglet] = useState(ongletInitial)

  // Session existante ? On vérifie que le compte est bien staff.
  useEffect(() => {
    const tokens = getTokens()
    if (!tokens) { setPret(true); return }
    api.get('/auth/me/')
      .then(({ data }) => setUser(data.is_staff ? data : null))
      .catch(() => clearTokens())
      .finally(() => setPret(true))
  }, [])

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('hoopci-admin-logout', onLogout)
    return () => window.removeEventListener('hoopci-admin-logout', onLogout)
  }, [])

  if (!pret) return <Spinner />
  if (!user) return <LoginView onLogin={setUser} />

  const Vue = ONGLETS.find((o) => o.id === onglet)?.vue ?? OverviewView

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <span className="brand">
            <span className="hoop">Hoop</span><span className="ci">CI</span><span className="adm">· Admin</span>
          </span>
          <span className="who">
            {user.nom_complet || user.email} · API : {API_URL}
            <button
              className="btn ghost"
              style={{ marginLeft: 12 }}
              onClick={() => { clearTokens(); setUser(null) }}
            >
              <LogOut size={13} /> Quitter
            </button>
          </span>
        </div>
      </header>
      <div className="tricolor" />

      <main className="wrap">
        <div className="tabs" role="tablist">
          {ONGLETS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={onglet === id}
              className={onglet === id ? 'active' : ''}
              onClick={() => { setOnglet(id); window.location.hash = id }}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>
        <Vue />
        <footer className="pied">
          HoopCI Admin — dashboard autonome relié à {API_URL}. Réservé au staff.
        </footer>
      </main>
    </>
  )
}

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const seConnecter = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    try {
      const { data: tokens } = await api.post('/auth/login/', { email, password })
      setTokens(tokens)
      const { data: me } = await api.get('/auth/me/')
      if (!me.is_staff) {
        clearTokens()
        setErreur('Ce compte n’est pas administrateur — accès refusé.')
        return
      }
      onLogin(me)
    } catch (err) {
      clearTokens()
      setErreur(apiError(err, 'Connexion impossible. Vérifie l’adresse de l’API et tes identifiants.'))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={seConnecter}>
        <h1><span style={{ color: 'var(--orange)' }}>Hoop</span><span style={{ color: 'var(--green)' }}>CI</span> Admin</h1>
        <p className="muted" style={{ fontSize: 12.5 }}>
          Dashboard d'administration — connecté à <b>{API_URL}</b>
        </p>
        <div className="field">
          <label>E-mail administrateur</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {erreur && <p className="alerte">{erreur}</p>}
        <button className="btn" type="submit" disabled={envoi}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
