import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { ItemVisual, SkinName } from '@/components/cases/ItemCard'
import { exteriorLabel, formatCredits, rarityMeta } from '@/lib/cases'
import { formatDateTime, statusLabel, type InventoryEntry } from '@/lib/inventory'
import { cn } from '@/lib/utils'

interface InventoryCardProps {
  entry: InventoryEntry
  /** Bouton d'action (revente) sous la carte. */
  action?: ReactNode
}

export function InventoryCard({ entry, action }: InventoryCardProps) {
  const meta = rarityMeta[entry.rarity]
  const owned = entry.status === 'owned'
  return (
    <article
      className={cn('flex flex-col overflow-hidden rounded-xl border-2 bg-card', meta.border, !owned && 'opacity-60')}
      aria-label={entry.name}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 text-xs">
        <Badge variant={owned ? 'secondary' : 'outline'}>{statusLabel[entry.status]}</Badge>
        {entry.exterior && (
          <abbr title={exteriorLabel[entry.exterior]} className="font-medium text-muted-foreground no-underline">
            {entry.exterior}
          </abbr>
        )}
      </div>
      <ItemVisual item={entry} className="aspect-[4/3] w-full" />
      <div className={cn('flex flex-1 flex-col border-t-2 px-3 pt-2 pb-3', meta.border)}>
        <SkinName item={entry} />
        <p className={cn('mt-0.5 text-xs', meta.text)}>{meta.label}</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-gold-300">{formatCredits(entry.value)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <time dateTime={entry.acquired_at}>{formatDateTime(entry.acquired_at)}</time>
          {entry.case_name && <> · {entry.case_name}</>}
        </p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </article>
  )
}
