import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { toastError } from '../lib/api'
import { buttonGhost, buttonOutline, buttonPrimary } from '../lib/styles'
import { Logo } from './Logo'

const credits = new Intl.NumberFormat('fr-FR')

export function Header() {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const onLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch (err) {
      toastError(err, 'Déconnexion impossible.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-5 text-sm sm:flex" aria-label="Navigation principale">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'text-gold-300' : 'text-muted hover:text-parchment')}
          >
            Caisses
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user === undefined && <div className="h-9 w-40 animate-pulse rounded-md bg-panel" aria-hidden />}

          {user === null && (
            <>
              <Link to="/connexion" className={`${buttonOutline} whitespace-nowrap px-3 py-2 sm:px-4`}>
                Se connecter
              </Link>
              <Link to="/inscription" className={`${buttonPrimary} whitespace-nowrap px-3 py-2 sm:px-4`}>
                S’inscrire
              </Link>
            </>
          )}

          {user && (
            <>
              <span
                className="whitespace-nowrap rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-semibold tabular-nums text-gold-300"
                title="Solde en crédits"
              >
                {credits.format(user.balance)} <span className="font-normal text-muted">crédits</span>
              </span>
              <span className="hidden max-w-36 truncate text-sm text-parchment md:inline">{user.username}</span>
              <button type="button" onClick={onLogout} disabled={loggingOut} className={`${buttonGhost} whitespace-nowrap px-3 py-2`}>
                Se déconnecter
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
