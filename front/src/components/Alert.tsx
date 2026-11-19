import type { ReactNode } from 'react'

// Messages de confirmation dans la page. Les erreurs passent par le toaster
// (sauf les erreurs de champ, affichées sous le champ concerné).
const tones = {
  success: 'border-success/40 bg-success/10 text-success',
  info: 'border-gold-500/40 bg-gold-500/10 text-gold-300',
}

export function Alert({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <div role="status" className={`rounded-md border px-3.5 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}
