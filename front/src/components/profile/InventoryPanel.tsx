import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toastError } from '@/lib/api'
import { formatCredits, rarityMeta, type Rarity } from '@/lib/cases'
import { listInventory, type InventoryEntry, type SaleResult } from '@/lib/inventory'
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

export function InventoryPanel() {
  const [status, setStatus] = useState<StatusFilter>('owned')
  const [rarity, setRarity] = useState<Rarity | 'all'>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [result, setResult] = useState<{ status: StatusFilter; items: InventoryEntry[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [selling, setSelling] = useState<InventoryEntry | null>(null)
  const { refresh } = useAuth()

  useEffect(() => {
    let active = true
    listInventory(status)
      .then((items) => {
        if (!active) return
        setFailed(false)
        setResult({ status, items })
      })
      .catch((err) => {
        if (!active) return
        setFailed(true)
        toastError(err, "Impossible de charger l'inventaire.")
      })
    return () => {
      active = false
    }
  }, [status])

  const onSold = (sale: SaleResult) => {
    setResult((current) => {
      if (!current) return current
      const items =
        current.status === 'owned'
          ? current.items.filter((i) => i.id !== sale.inventory_item_id)
          : current.items.map((i) => (i.id === sale.inventory_item_id ? { ...i, status: 'sold' as const } : i))
      return { ...current, items }
    })
    void refresh()
  }

  const items = result?.status === status ? result.items : null
  const visible = useMemo(
    () => (items ?? []).filter((i) => rarity === 'all' || i.rarity === rarity).sort(compare(sort)),
    [items, rarity, sort],
  )
  const total = visible.reduce((sum, i) => sum + i.value, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Statut" className="flex rounded-lg border p-0.5">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                status === f.value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity | 'all')}>
          <SelectTrigger className="w-44" aria-label="Rareté">
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
          <SelectTrigger className="w-48" aria-label="Tri">
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
