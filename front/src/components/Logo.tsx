import { Link } from 'react-router'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md" aria-label="HeavenCases, accueil">
      <img src="/heavencases-icon.png" alt="" className="size-9 rounded-lg" />
      <span className="hidden font-display text-lg font-bold tracking-wide text-foreground sm:inline">
        HEAVEN<span className="text-gold-gradient">CASES</span>
      </span>
    </Link>
  )
}
