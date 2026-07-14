import { NavLink } from 'react-router-dom'
import { Home, Users, Plus, Star, Mail, User, CalendarRange } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'

export default function BottomNav() {
  const { user } = useAuthStore()
  const isPromoteur = user?.role === 'promoteur'

  const cls = ({ isActive }) => `nav-btn${isActive ? ' active' : ''}`

  return (
    <nav className="bottomnav" aria-label="Navigation principale">
      <NavLink to="/" end className={cls}>
        <Home />Accueil
      </NavLink>
      <NavLink to="/evenements" className={cls}>
        <CalendarRange />Événements
      </NavLink>
      {isPromoteur ? (
        <NavLink to="/creer" className={({ isActive }) => `nav-btn create-btn${isActive ? ' active' : ''}`}>
          <span className="plus"><Plus size={26} /></span>Créer
        </NavLink>
      ) : (
        <NavLink to="/favoris" className={({ isActive }) => `nav-btn create-btn${isActive ? ' active' : ''}`}>
          <span className="plus"><Star size={24} /></span>Favoris
        </NavLink>
      )}
      <NavLink to="/joueurs" className={cls}>
        <Users />Joueurs
      </NavLink>
      <NavLink to="/offres" className={cls}>
        <Mail />Offres
      </NavLink>
      <NavLink to={user ? (isPromoteur ? '/mes-tournois' : '/profil') : '/login'} className={cls}>
        <User />{user ? (isPromoteur ? 'Mes tournois' : 'Profil') : 'Connexion'}
      </NavLink>
    </nav>
  )
}
