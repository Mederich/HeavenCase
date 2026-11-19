import { CrosshairIcon, HandIcon, SwordIcon, type LucideIcon } from 'lucide-react'
import {
  exteriorLabel,
  formatCredits,
  formatProbability,
  rarityMeta,
  splitSkinName,
  type LootEntry,
} from '@/lib/cases'
import { cn } from '@/lib/utils'

/** Icône de repli quand le skin n'a pas d'image. */
function skinIcon(name: string): LucideIcon {
  if (name.startsWith('★')) return /gloves|wraps/i.test(name) ? HandIcon : SwordIcon
  return CrosshairIcon
}

export function ItemVisual({ item, className }: { item: Pick<LootEntry, 'name' | 'image_url' | 'rarity'>; className?: string }) {
  const meta = rarityMeta[item.rarity]
  const Icon = skinIcon(item.name)
  return (
    <div className={cn('relative grid place-items-center', className)}>
      <div className={cn('absolute inset-0 bg-radial to-transparent to-70%', meta.glow)} aria-hidden />
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          className="relative max-h-full max-w-full object-contain p-2 drop-shadow-[0_6px_10px_rgb(0_0_0/0.6)]"
        />
      ) : (
        <Icon className={cn('relative size-2/5', meta.text)} strokeWidth={1.3} aria-hidden />
      )}
    </div>
  )
}

/** Arme en petit (avec StatTrak™), nom du skin en gras. */
export function SkinName({
  item,
  className,
}: {
  item: Pick<LootEntry, 'name' | 'stattrak'>
  className?: string
}) {
  const { weapon, skin } = splitSkinName(item.name)
  return (
    <div className={cn('min-w-0', className)} title={`${item.stattrak ? 'StatTrak™ ' : ''}${item.name}`}>
      <p className="truncate text-xs text-muted-foreground">
        {item.stattrak && <span className="text-stattrak">StatTrak™ </span>}
        {weapon}
      </p>
      <p className="truncate text-sm font-semibold text-foreground">{skin ?? weapon}</p>
    </div>
  )
}

interface ItemCardProps {
  item: LootEntry
  /** Affiche la probabilité (fiche caisse) ou non (roulette). */
  showProbability?: boolean
  className?: string
}

export function ItemCard({ item, showProbability = true, className }: ItemCardProps) {
  const meta = rarityMeta[item.rarity]
  return (
    <div
      className={cn('flex flex-col overflow-hidden rounded-xl border-2 bg-card', meta.border, className)}
      title={meta.label}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 text-xs">
        {showProbability ? (
          <span className="font-semibold tabular-nums text-foreground">{formatProbability(item.probability)}</span>
        ) : (
          <span />
        )}
        {item.exterior && (
          <abbr title={exteriorLabel[item.exterior]} className="font-medium text-muted-foreground no-underline">
            {item.exterior}
          </abbr>
        )}
      </div>
      <ItemVisual item={item} className="aspect-[4/3] w-full" />
      <span className="sr-only">{meta.label}</span>
      <div className={cn('border-t-2 px-3 pt-2 pb-3', meta.border)}>
        <SkinName item={item} />
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-gold-300">{formatCredits(item.value)}</p>
      </div>
    </div>
  )
}
