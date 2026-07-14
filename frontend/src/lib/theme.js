const KEY = 'hoopci-theme'
const META_COLORS = { dark: '#0D0D0D', light: '#F4F4F1' }

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* stockage indisponible */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem(KEY, theme) } catch { /* stockage indisponible */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme])
  return theme
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
  return applyTheme(next)
}
