import { Link } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { CaseGrid } from '@/components/cases/CaseGrid'
import { Button } from '@/components/ui/button'
import hero from '@/assets/hero-zeus.jpg'

export function HomePage() {
  const { user } = useAuth()

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <img
          src={hero}
          alt=""
          className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover object-top opacity-60 md:w-3/5"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/10" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-background to-transparent" />
        <div className="mx-auto flex min-h-[28rem] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6">
          <h1 className="max-w-xl font-display text-4xl font-bold leading-tight text-gold-gradient sm:text-5xl">
            Ouvrez des caisses CS2 et découvrez des skins divins
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Des caisses de skins CS2, des probabilités affichées et des tirages que tu peux vérifier toi-même.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {user ? (
              <p className="text-sm">
                Bienvenue, <span className="font-semibold text-gold-300">{user.username}</span>.
              </p>
            ) : (
              <Button asChild size="lg" className="h-11 px-6">
                <Link to="/register">Commencer maintenant</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6" aria-labelledby="home-cases">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="home-cases" className="font-display text-2xl font-bold text-foreground">
            Nos caisses
          </h2>
          <Link to="/cases" className="text-sm text-muted-foreground hover:text-gold-300">
            Voir toutes les caisses →
          </Link>
        </div>
        <CaseGrid />
      </section>
    </>
  )
}
