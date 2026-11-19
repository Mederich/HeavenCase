import { Link } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import hero from '@/assets/hero-zeus.jpg'

export function HomePage() {
  const { user } = useAuth()

  return (
    <section className="relative isolate overflow-hidden">
      <img src={hero} alt="" className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover object-top opacity-60 md:w-3/5" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/10" />
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="max-w-xl font-display text-4xl font-bold leading-tight text-gold-gradient sm:text-5xl">
          Ouvrez des caisses et découvrez des objets divins
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          Des caisses aux probabilités affichées et des tirages que tu peux vérifier toi-même.
        </p>
        <div className="mt-8">
          {user ? (
            <p className="text-sm text-foreground">
              Bienvenue, <span className="font-semibold text-gold-300">{user.username}</span>. Le catalogue des caisses
              arrive très bientôt.
            </p>
          ) : (
            <Button asChild size="lg" className="h-11 px-6">
              <Link to="/inscription">Commencer maintenant</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
