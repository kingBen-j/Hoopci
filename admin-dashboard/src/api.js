import axios from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const TOKENS_KEY = 'hoopci-admin-tokens'

export const getTokens = () => {
  try { return JSON.parse(localStorage.getItem(TOKENS_KEY)) } catch { return null }
}
export const setTokens = (tokens) => localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
export const clearTokens = () => localStorage.removeItem(TOKENS_KEY)

const api = axios.create({ baseURL: `${API_URL}/api` })

api.interceptors.request.use((config) => {
  const tokens = getTokens()
  if (tokens?.access) config.headers.Authorization = `Bearer ${tokens.access}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const tokens = getTokens()
      if (tokens?.refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/token/refresh/`, { refresh: tokens.refresh })
          setTokens({ ...tokens, access: data.access, refresh: data.refresh ?? tokens.refresh })
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          clearTokens()
          window.dispatchEvent(new Event('hoopci-admin-logout'))
        }
      }
    }
    return Promise.reject(error)
  },
)

export const apiError = (err, fallback = 'Une erreur est survenue') => {
  const d = err?.response?.data
  if (!d) return fallback
  if (d.detail) return d.detail
  const first = Object.values(d)[0]
  if (Array.isArray(first)) return first[0]
  if (typeof first === 'string') return first
  return fallback
}

export default api
