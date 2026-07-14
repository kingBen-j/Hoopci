import axios from 'axios'
import { useAuthStore } from '../store/authStore.js'

// URL du backend quand l'API est sur un autre domaine (Render : VITE_API_URL au build) ;
// vide en dev — les appels passent alors par le proxy Vite (/api → localhost:8000)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const client = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(`${API_BASE}/api/auth/token/refresh/`, { refresh: refreshToken })
        // ROTATE_REFRESH_TOKENS est actif côté backend : l'ancien refresh token est
        // blacklisté à chaque refresh, il faut impérativement stocker le nouveau
        useAuthStore.getState().setTokens(data.access, data.refresh ?? refreshToken)
        original.headers.Authorization = `Bearer ${data.access}`
        return client(original)
      } catch {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  },
)

export default client
