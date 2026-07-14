import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore.js'
import { syncSportJoueur } from './store/sportStore.js'
import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import RegisterPage from './pages/auth/RegisterPage.jsx'
import TournoiDetailPage from './pages/tournois/TournoiDetailPage.jsx'
import CreerTournoiPage from './pages/tournois/CreerTournoiPage.jsx'
import DashboardPage from './pages/tournois/DashboardPage.jsx'
import PalmaresPage from './pages/tournois/PalmaresPage.jsx'
import JoueursPage from './pages/joueurs/JoueursPage.jsx'
import JoueurDetailPage from './pages/joueurs/JoueurDetailPage.jsx'
import MesEquipesPage from './pages/joueurs/MesEquipesPage.jsx'
import EvenementsPage from './pages/evenements/EvenementsPage.jsx'
import EvenementDetailPage from './pages/evenements/EvenementDetailPage.jsx'
import CreerEvenementPage from './pages/evenements/CreerEvenementPage.jsx'
import PromoteursPage from './pages/PromoteursPage.jsx'
import PaiementTournoiPage from './pages/paiement/PaiementTournoiPage.jsx'
import PaiementEquipePage from './pages/paiement/PaiementEquipePage.jsx'
import RetourPaiementPage from './pages/paiement/RetourPaiementPage.jsx'
import OffresPage from './pages/OffresPage.jsx'
import FavorisPage from './pages/FavorisPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

export default function App() {
  const user = useAuthStore((s) => s.user)

  // Le contenu proposé suit le sport du joueur connecté
  // (footballeur → contenu foot, basketteur → contenu basket)
  useEffect(() => {
    if (user?.role === 'joueur') syncSportJoueur()
  }, [user?.role])

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="tournois/:id" element={<TournoiDetailPage />} />
          <Route path="palmares" element={<PalmaresPage />} />
          <Route path="joueurs" element={<JoueursPage />} />
          <Route path="joueurs/:id" element={<JoueurDetailPage />} />
          <Route path="evenements" element={<EvenementsPage />} />
          <Route path="evenements/:id" element={<EvenementDetailPage />} />
          <Route path="promoteurs" element={<PromoteursPage />} />

          {/* Connecté (tout rôle) */}
          <Route element={<ProtectedRoute />}>
            <Route path="offres" element={<OffresPage />} />
            <Route path="favoris" element={<FavorisPage />} />
            <Route path="profil" element={<ProfilePage />} />
          </Route>

          {/* Joueur */}
          <Route element={<ProtectedRoute roles={['joueur']} />}>
            <Route path="mes-equipes" element={<MesEquipesPage />} />
          </Route>

          {/* Promoteur */}
          <Route element={<ProtectedRoute roles={['promoteur']} />}>
            <Route path="creer" element={<CreerTournoiPage />} />
            <Route path="mes-tournois" element={<DashboardPage />} />
            <Route path="creer-evenement" element={<CreerEvenementPage />} />
          </Route>

          {/* Promotion payante d'un tournoi (promoteur) */}
          <Route element={<ProtectedRoute roles={['promoteur']} />}>
            <Route path="paiement/tournoi/:id" element={<PaiementTournoiPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="paiement/equipe/:id" element={<PaiementEquipePage />} />
            <Route path="paiement/retour" element={<RetourPaiementPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
