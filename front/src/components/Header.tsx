import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/api'
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
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-5 text-sm sm:flex" aria-label="Navigation principale">
          <NavLink
            to="/cases"
            className={({ isActive }) => (isActive ? 'text-gold-300' : 'text-muted-foreground hover:text-foreground')}
          >
            Caisses
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user === undefined && <div className="h-9 w-40 animate-pulse rounded-md bg-card" aria-hidden />}

          {user === null && (
            <>
              <Button asChild variant="outline" size="lg" className="border-gold-500/70 text-gold-300 dark:border-gold-500/70 dark:bg-transparent dark:hover:bg-gold-500/10">
                <Link to="/login">Se connecter</Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/register">S’inscrire</Link>
              </Button>
            </>
          )}

          {user && (
            <>
              <span
                className="rounded-md border bg-card px-3 py-1.5 text-sm font-semibold whitespace-nowrap tabular-nums text-gold-300"
                title="Solde en crédits"
              >
                {credits.format(user.balance)} <span className="font-normal text-muted-foreground">crédits</span>
              </span>
              <span className="hidden max-w-36 truncate text-sm md:inline">{user.username}</span>
              <Button variant="ghost" size="lg" onClick={onLogout} disabled={loggingOut}>
                Se déconnecter
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
