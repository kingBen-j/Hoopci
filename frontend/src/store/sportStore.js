import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMonProfil } from '../api/players.js'

/**
 * Sport préféré — pré-remplit le filtre Sport des pages de contenu
 * (tournois, événements, joueurs) ; '' = tous les sports.
 * Joueur : synchronisé automatiquement depuis son profil sportif (App.jsx).
 * Client / recruteur : choisi dans « Mon profil ».
 */
export const useSportStore = create(
  persist(
    (set) => ({
      sportPrefere: '',
      setSportPrefere: (sport) => set({ sportPrefere: sport || '' }),
    }),
    { name: 'hoopci-sport' },
  ),
)

/** Aligne la préférence d'un joueur connecté sur le sport de son profil. */
export async function syncSportJoueur() {
  try {
    const { data } = await getMonProfil()
    useSportStore.getState().setSportPrefere(data?.sport)
  } catch {
    // Profil indisponible (hors-ligne, token expiré…) : on garde la préférence actuelle
  }
}
