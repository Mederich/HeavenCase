import { Link, NavLink } from 'react-router'
import { PlusIcon, WalletIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { AccountMenu } from './AccountMenu'
import { Logo } from './Logo'

const credits = new Intl.NumberFormat('fr-FR')

const navLink = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'text-gold-300'
    : 'text-muted-foreground transition-colors hover:text-foreground'

export function Header() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex" aria-label="Navigation principale">
          <NavLink to="/cases" className={navLink}>
            Caisses
          </NavLink>
          {user && (
            <NavLink to="/profile" className={navLink}>
              Inventaire
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {user === undefined && <div className="h-10 w-44 animate-pulse rounded-lg bg-card" aria-hidden />}

          {user === null && (
            <>
              <Button asChild variant="ghost" size="lg">
                <Link to="/login">Se connecter</Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/register">S’inscrire</Link>
              </Button>
            </>
          )}

          {user && (
            <>
              <Link
                to="/profile?tab=history"
                className="flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm transition-colors hover:border-gold-500/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Solde : ${credits.format(user.balance)} crédits. Voir les transactions`}
              >
                <WalletIcon className="size-4 text-gold-400" aria-hidden />
                <span className="font-semibold whitespace-nowrap tabular-nums text-gold-300">
                  {credits.format(user.balance)}
                </span>
                <span className="hidden text-muted-foreground lg:inline">crédits</span>
              </Link>
              <Button asChild size="lg" className="h-10 px-3 md:px-4">
                <Link to="/deposit" aria-label="Déposer des crédits">
                  <PlusIcon aria-hidden />
                  <span className="hidden md:inline">Déposer</span>
                </Link>
              </Button>
              <AccountMenu user={user} />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
