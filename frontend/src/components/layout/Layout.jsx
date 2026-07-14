import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header.jsx'
import BottomNav from './BottomNav.jsx'
import Onboarding from '../onboarding/Onboarding.jsx'

export default function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Onboarding />
      <Header />
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}
