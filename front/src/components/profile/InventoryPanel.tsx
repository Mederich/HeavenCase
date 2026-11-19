import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCredits, rarityMeta, type Rarity } from '@/lib/cases'
import type { InventoryEntry, SaleResult } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import { InventoryCard } from './InventoryCard'
import { SellDialog } from './SellDialog'

type StatusFilter = 'owned' | 'sold' | 'all'
type Sort = 'recent' | 'oldest' | 'value-desc' | 'value-asc'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'owned', label: 'Disponibles' },
  { value: 'sold', label: 'Vendus' },
  { value: 'all', label: 'Tous' },
]

const sorts: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'value-desc', label: 'Valeur décroissante' },
  { value: 'value-asc', label: 'Valeur croissante' },
]

const rarities = Object.keys(rarityMeta) as Rarity[]

const grid = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'

function compare(sort: Sort) {
  return (a: InventoryEntry, b: InventoryEntry) => {
    switch (sort) {
      case 'recent':
        return b.acquired_at.localeCompare(a.acquired_at)
      case 'oldest':
        return a.acquired_at.localeCompare(b.acquired_at)
      case 'value-desc':
        return b.value - a.value
      case 'value-asc':
        return a.value - b.value
    }
  }
}

interface InventoryPanelProps {
  /** Tout l'inventaire (tous statuts) ; null pendant le chargement. */
  items: InventoryEntry[] | null
  failed: boolean
  onSold: (sale: SaleResult) => void
}

export function InventoryPanel({ items: all, failed, onSold }: InventoryPanelProps) {
  const [status, setStatus] = useState<StatusFilter>('owned')
  const [rarity, setRarity] = useState<Rarity | 'all'>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [selling, setSelling] = useState<InventoryEntry | null>(null)

  const items = useMemo(
    () => (all ? all.filter((i) => status === 'all' || i.status === status) : null),
    [all, status],
  )
  const visible = useMemo(
    () => (items ?? []).filter((i) => rarity === 'all' || i.rarity === rarity).sort(compare(sort)),
    [items, rarity, sort],
  )
  const total = visible.reduce((sum, i) => sum + i.value, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Statut" className="flex h-9 w-full items-center rounded-lg border p-0.5 sm:w-auto">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                'h-7 flex-1 rounded-md px-3 text-sm sm:flex-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                status === f.value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex w-full gap-3 sm:w-auto">
        <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity | 'all')}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-44 sm:flex-none" aria-label="Rareté">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les raretés</SelectItem>
            {rarities.map((r) => (
              <SelectItem key={r} value={r}>
                {rarityMeta[r].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-48 sm:flex-none" aria-label="Tri">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sorts.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>

        {items && (
          <p className="text-sm text-muted-foreground sm:ml-auto">
            {visible.length} skin{visible.length > 1 ? 's' : ''} ·{' '}
            <span className="font-semibold tabular-nums text-gold-300">{formatCredits(total)}</span>
          </p>
        )}
      </div>

      {failed ? (
        <p className="text-sm text-muted-foreground">Inventaire indisponible.</p>
      ) : !items ? (
        <div className={grid} aria-busy="true" aria-label="Chargement de l'inventaire">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {items.length === 0 && status === 'owned' ? 'Aucun skin dans ton inventaire.' : 'Aucun skin pour ces filtres.'}
          </p>
          {items.length === 0 && status === 'owned' ? (
            <Button asChild>
              <Link to="/cases">Ouvrir une caisse</Link>
            </Button>
          ) : (
            rarity !== 'all' && (
              <Button variant="outline" onClick={() => setRarity('all')}>
                Toutes les raretés
              </Button>
            )
          )}
        </div>
      ) : (
        <div className={grid}>
          {visible.map((entry) => (
            <InventoryCard
              key={entry.id}
              entry={entry}
              action={
                entry.status === 'owned' && (
                  <Button variant="outline" className="w-full" onClick={() => setSelling(entry)}>
                    Vendre
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}

      <SellDialog entry={selling} onClose={() => setSelling(null)} onSold={onSold} />
    </div>
  )
}
