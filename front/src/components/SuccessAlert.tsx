import type { ReactNode } from 'react'
import { CircleCheckIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Confirmation affichée dans la page. Les erreurs passent par le toaster
// (sauf les erreurs de champ, affichées sous le champ concerné).
export function SuccessAlert({ children }: { children: ReactNode }) {
  return (
    <Alert role="status" className="border-success/40 bg-success/10 px-3.5 py-3 text-success">
      <CircleCheckIcon />
      <AlertDescription className="text-success/90">{children}</AlertDescription>
    </Alert>
  )
}
