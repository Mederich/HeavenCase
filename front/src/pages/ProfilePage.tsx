import { Navigate, useLocation, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { InventoryPanel } from '@/components/profile/InventoryPanel'
import { TransactionsPanel } from '@/components/profile/TransactionsPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCredits } from '@/lib/cases'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Tab = 'inventory' | 'history'

export function ProfilePage() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'history' ? 'history' : 'inventory'

  if (user === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }
  if (user === null) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  const selectTab = (value: string) => {
    setSearchParams(value === 'history' ? { tab: 'history' } : {}, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-bold text-gold-gradient">{user.username}</h1>
          {user.email && <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>}
        </div>
        <div className="rounded-xl border bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">Solde</p>
          <p className="text-2xl font-bold tabular-nums text-gold-300">{formatCredits(user.balance)}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={selectTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="inventory">Inventaire</TabsTrigger>
          <TabsTrigger value="history">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="mt-6">
          <InventoryPanel />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <TransactionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
