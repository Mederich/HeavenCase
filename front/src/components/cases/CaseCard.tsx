import { Link } from 'react-router'
import { formatCredits, type CaseSummary } from '@/lib/cases'
import { CaseVisual } from './CaseVisual'

export function CaseCard({ item }: { item: CaseSummary }) {
  return (
    <Link
      to={`/cases/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:border-gold-500/60 hover:shadow-lg hover:shadow-gold-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
    >
      <div className="overflow-hidden">
        <CaseVisual
          name={item.name}
          price={item.price}
          imageUrl={item.image_url}
          className="transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-base font-semibold text-foreground">{item.name}</h3>
        <p className="font-semibold tabular-nums text-gold-300">{formatCredits(item.price)}</p>
      </div>
    </Link>
  )
}
