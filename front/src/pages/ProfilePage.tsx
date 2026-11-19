import { useCallback, useEffect, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { InventoryPanel } from '@/components/profile/InventoryPanel'
import { TransactionsPanel } from '@/components/profile/TransactionsPanel'
import { UserAvatar } from '@/components/UserAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toastError } from '@/lib/api'
import { listInventory, type InventoryEntry, type SaleResult } from '@/lib/inventory'

type Tab = 'inventory' | 'history'

const number = new Intl.NumberFormat('fr-FR')

export function ProfilePage() {
  const { user, setBalance } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'history' ? 'history' : 'inventory'

  const [items, setItems] = useState<InventoryEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  // Change à chaque vente pour recharger l'historique.
  const [salesCount, setSalesCount] = useState(0)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let active = true
    listInventory('all')
      .then((list) => active && setItems(list))
      .catch((err) => {
        if (!active) return
        setFailed(true)
        toastError(err, "Impossible de charger l'inventaire.")
      })
    return () => {
      active = false
    }
  }, [userId])

  const onSold = useCallback(
    (sale: SaleResult) => {
      setItems((current) =>
        current?.map((i) => (i.id === sale.inventory_item_id ? { ...i, status: 'sold' as const } : i)) ?? current,
      )
      setBalance(sale.balance_after)
      setSalesCount((n) => n + 1)
    },
    [setBalance],
  )

  if (user === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-20 rounded-xl" />
      </div>
    )
  }
  if (user === null) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />

  const owned = items?.filter((i) => i.status === 'owned') ?? []
  const inventoryValue = owned.reduce((sum, i) => sum + i.value, 0)

  const selectTab = (value: string) => {
    setSearchParams(value === 'history' ? { tab: 'history' } : {}, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar username={user.username} className="size-14 text-xl" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-foreground">{user.username}</h1>
            {user.email && user.email !== user.username && (
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>

        <dl className="grid w-full grid-cols-3 divide-x rounded-xl border bg-card sm:w-auto">
          <Stat label="Solde" value={number.format(user.balance)} unit="crédits" highlight />
          <Stat label="Skins" value={items ? number.format(owned.length) : '–'} />
          <Stat label="Valeur" value={items ? number.format(inventoryValue) : '–'} unit="crédits" />
        </dl>
      </div>

      <Tabs value={tab} onValueChange={selectTab} className="mt-8 gap-6">
        <TabsList variant="line" className="h-auto w-full justify-start gap-6 rounded-none border-b p-0 pb-2">
          <TabsTrigger value="inventory" className="flex-none px-0 text-base">
            Inventaire
            {items && owned.length > 0 && (
              <span className="rounded-full bg-secondary px-1.5 text-xs tabular-nums text-muted-foreground">
                {owned.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-none px-0 text-base">
            Transactions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inventory">
          <InventoryPanel items={items} failed={failed} onSold={onSold} />
        </TabsContent>
        <TabsContent value="history">
          <TransactionsPanel key={salesCount} />
        </TabsContent>
      </Tabs>

    </div>
  )
}

interface StatProps {
  label: string
  value: string
  unit?: string
  highlight?: boolean
}

function Stat({ label, value, unit, highlight }: StatProps) {
  return (
    <div className="min-w-0 px-4 py-2.5 sm:px-5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={highlight ? 'truncate font-semibold tabular-nums text-gold-300' : 'truncate font-semibold tabular-nums'}>
        <span className="text-lg">{value}</span>
        {unit && <span className="ml-1 hidden text-xs font-normal text-muted-foreground sm:inline">{unit}</span>}
      </dd>
    </div>
  )
}
