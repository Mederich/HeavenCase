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
        <div className="mx-auto flex min-h-[22rem] max-w-7xl flex-col justify-center px-4 py-14 sm:px-6">
          <h1 className="max-w-xl font-display text-4xl font-bold leading-tight text-gold-gradient sm:text-5xl">
            Ouvrez des caisses CS2 et découvrez des skins divins
          </h1>
          {!user && (
            <div className="mt-8">
              <Button asChild size="lg" className="h-11 px-6">
                <Link to="/register">Commencer maintenant</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <CaseGrid />
      </div>
    </>
  )
}
