import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-5xl font-bold text-gold-gradient">404</p>
      <p className="mt-3 text-muted-foreground">Page introuvable.</p>
      <Button asChild variant="outline" size="lg" className="mt-8">
        <Link to="/">Retour à l’accueil</Link>
      </Button>
    </div>
  )
}
