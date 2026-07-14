import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Plus, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'
import { toggleTheme } from '../../lib/theme.js'
import { initials } from '../../lib/constants.js'

export default function Header() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'dark')

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link to="/" className="brand" aria-label="Accueil HoopCI">
            <img src="/logo-header.png" alt="" width="42" height="42" />
            <b><span className="hoop">Hoop</span><span className="ci">CI</span></b>
          </Link>

          <nav className="desktop-nav">
            <NavLink to="/" end>Tournois</NavLink>
            <NavLink to="/evenements">Événements</NavLink>
            <NavLink to="/joueurs">Joueurs</NavLink>
            <NavLink to="/palmares">Palmarès</NavLink>
            <NavLink to="/promoteurs">Top promoteurs</NavLink>
            {user && <NavLink to="/offres">Offres</NavLink>}
            {user && <NavLink to="/favoris">Favoris</NavLink>}
            {user?.role === 'promoteur' && <NavLink to="/mes-tournois">Mes tournois</NavLink>}
          </nav>

          <div className="top-actions">
            <button
              className="icon-btn"
              onClick={() => setTheme(toggleTheme())}
              aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
              title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user?.role === 'promoteur' && (
              <button className="btn sm" onClick={() => navigate('/creer')} style={{ display: 'none' }} id="header-create">
                <span><Plus size={15} /> Créer un tournoi</span>
              </button>
            )}
            {user ? (
              <button className="avatar-btn" onClick={() => navigate('/profil')} aria-label="Mon profil">
                {user.photo ? <img src={user.photo} alt="" /> : initials(user.nom_complet || user.email)}
              </button>
            ) : (
              <button className="btn sm" onClick={() => navigate('/login')}>
                <span>Connexion</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="tricolor" />
      {/* Le bouton créer n'apparaît qu'en desktop — mobile a le + central */}
      <style>{`@media (min-width: 900px) { #header-create { display: inline-flex !important; } }`}</style>
    </>
  )
}
