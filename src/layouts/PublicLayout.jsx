import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PublicFooter from '../components/public/PublicFooter'
import PublicNavbar from '../components/public/PublicNavbar'
import { fetchActiveRaffle } from '../services/raffleService'

export default function PublicLayout() {
  const [activeRaffle, setActiveRaffle] = useState(null)

  useEffect(() => {
    let mounted = true

    async function loadActiveRaffle() {
      try {
        const raffle = await fetchActiveRaffle()

        if (mounted) {
          setActiveRaffle(raffle)
        }
      } catch {
        if (mounted) {
          setActiveRaffle(null)
        }
      }
    }

    loadActiveRaffle()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="app-shell">
      <div className="page-floral pointer-events-none" />
      <PublicNavbar activeRaffle={activeRaffle} />
      <main className="relative overflow-hidden">
        <Outlet context={{ activeRaffle }} />
      </main>
      <PublicFooter />
    </div>
  )
}
