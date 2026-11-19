import { CaseGrid } from '@/components/cases/CaseGrid'

export function CasesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-3xl font-bold text-gold-gradient">Caisses</h1>
      <CaseGrid />
    </div>
  )
}
