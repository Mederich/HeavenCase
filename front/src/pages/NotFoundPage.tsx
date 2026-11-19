import { Link } from 'react-router'
import { buttonOutline } from '../lib/styles'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-5xl font-bold text-gold-gradient">404</p>
      <p className="mt-3 text-muted">Cette page s’est perdue dans les nuages.</p>
      <Link to="/" className={`${buttonOutline} mt-8`}>
        Retour à l’accueil
      </Link>
    </div>
  )
}
