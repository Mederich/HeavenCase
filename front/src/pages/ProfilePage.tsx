import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { InventoryPanel } from '@/components/profile/InventoryPanel'
import { Skeleton } from '@/components/ui/skeleton'

export function ProfilePage() {
  const { user } = useAuth()
  const location = useLocation()

  if (user === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }
  if (user === null) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-gold-gradient">{user.username}</h1>
      {user.email && <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>}

      <section aria-labelledby="inventory-title" className="mt-10">
        <h2 id="inventory-title" className="mb-4 font-display text-xl font-bold">
          Inventaire
        </h2>
        <InventoryPanel />
      </section>
    </div>
  )
}
