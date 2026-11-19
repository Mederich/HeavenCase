import { CrosshairIcon, HandIcon, SwordIcon, type LucideIcon } from 'lucide-react'
import { formatCredits, formatProbability, rarityMeta, splitSkinName, type LootEntry } from '@/lib/cases'
import { cn } from '@/lib/utils'

/** Icône de repli tant que l'API ne fournit pas l'image du skin. */
function skinIcon(name: string): LucideIcon {
  if (name.startsWith('★')) return /gloves|wraps/i.test(name) ? HandIcon : SwordIcon
  return CrosshairIcon
}

/** Visuel d'un skin : son image si l'API en fournit une, sinon une icône (arme, couteau, gants). */
export function ItemVisual({ item, className }: { item: Pick<LootEntry, 'name' | 'image_url' | 'rarity'>; className?: string }) {
  const meta = rarityMeta[item.rarity]
  const Icon = skinIcon(item.name)
  return (
    <div className={cn('relative grid place-items-center', className)}>
      <div className={cn('absolute inset-0 bg-radial to-transparent to-70%', meta.glow)} aria-hidden />
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="relative max-h-full object-contain" />
      ) : (
        <Icon className={cn('relative size-2/5', meta.text)} strokeWidth={1.3} aria-hidden />
      )}
    </div>
  )
}

/** « AK-47 » en petit, « Redline » en gras, comme sur les cartes de la maquette. */
export function SkinName({ name, className }: { name: string; className?: string }) {
  const { weapon, skin } = splitSkinName(name)
  return (
    <div className={cn('min-w-0', className)} title={name}>
      <p className="truncate text-xs text-muted-foreground">{weapon}</p>
      <p className="truncate text-sm font-semibold text-foreground">{skin ?? weapon}</p>
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
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 text-xs">
        {showProbability ? (
          <span className="font-semibold tabular-nums text-foreground">{formatProbability(item.probability)}</span>
        ) : (
          <span />
        )}
        <span className={cn('truncate rounded px-1.5 py-0.5 font-medium', meta.bg, meta.text)}>{meta.label}</span>
      </div>
      <ItemVisual item={item} className="aspect-[4/3] w-full" />
      <div className={cn('border-t-2 px-3 pt-2 pb-3', meta.border)}>
        <SkinName name={item.name} />
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-gold-300">{formatCredits(item.value)}</p>
      </div>
    </div>
  )
}
