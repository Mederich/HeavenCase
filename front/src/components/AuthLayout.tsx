import type { ReactNode } from 'react'
import hero from '../assets/hero-zeus.jpg'

const perks = ['Des caisses aux probabilités affichées', 'Des tirages vérifiables (provably fair)', 'Un inventaire et des crédits virtuels']

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50 lg:grid-cols-[minmax(0,30rem)_1fr]">
        <section className="p-6 sm:p-10">
          <h1 className="font-display text-2xl font-bold text-gold-gradient sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </section>

        <aside className="relative hidden min-h-[36rem] lg:block">
          <img src={hero} alt="" className="absolute inset-0 size-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-panel via-panel/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent" />
          <ul className="absolute inset-x-0 bottom-0 space-y-2.5 p-8">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm text-parchment">
                <span className="text-gold-400" aria-hidden>
                  ✦
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
