import { CrownIcon, FeatherIcon, GemIcon, SparklesIcon, SunIcon, type LucideIcon } from 'lucide-react'
import { formatCredits, formatProbability, rarityMeta, type LootEntry, type Rarity } from '@/lib/cases'
import { cn } from '@/lib/utils'

const rarityIcon: Record<Rarity, LucideIcon> = {
  common: FeatherIcon,
  rare: GemIcon,
  epic: SparklesIcon,
  legendary: CrownIcon,
  mythic: SunIcon,
}

/** Visuel d'un objet : son image si l'API en fournit une, sinon une icône de sa rareté. */
export function ItemVisual({ item, className }: { item: Pick<LootEntry, 'name' | 'image_url' | 'rarity'>; className?: string }) {
  const meta = rarityMeta[item.rarity]
  const Icon = rarityIcon[item.rarity]
  return (
    <div className={cn('relative grid place-items-center', className)}>
      <div className={cn('absolute inset-0 bg-radial to-transparent to-70%', meta.glow)} aria-hidden />
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="relative max-h-full object-contain" />
      ) : (
        <Icon className={cn('relative size-1/2', meta.text)} strokeWidth={1.4} aria-hidden />
      )}
    </div>
  )
}

interface ItemCardProps {
  item: LootEntry
  /** Affiche la probabilité (fiche caisse) ou non (roulette, résultat). */
  showProbability?: boolean
  className?: string
}

export function ItemCard({ item, showProbability = true, className }: ItemCardProps) {
  const meta = rarityMeta[item.rarity]
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border-2 bg-card', meta.border, className)}>
      <div className="flex items-center justify-between px-3 pt-2.5 text-xs">
        {showProbability ? (
          <span className="font-semibold tabular-nums text-foreground">{formatProbability(item.probability)}</span>
        ) : (
          <span />
        )}
        <span className={cn('rounded px-1.5 py-0.5 font-medium', meta.bg, meta.text)}>{meta.label}</span>
      </div>
      <ItemVisual item={item} className="aspect-[4/3] w-full" />
      <div className="px-3 pb-3">
        <p className="truncate text-sm font-medium text-foreground" title={item.name}>
          {item.name}
        </p>
        <p className={cn('text-sm font-semibold tabular-nums', meta.text)}>{formatCredits(item.value)}</p>
      </div>
    </div>
  )
}
