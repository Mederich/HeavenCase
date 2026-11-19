import { CaseGrid } from '@/components/cases/CaseGrid'

export function CasesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-gold-gradient">Caisses</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choisis une caisse pour voir son contenu et les chances d’obtenir chaque skin.
      </p>
      <div className="mt-8">
        <CaseGrid />
      </div>
    </div>
  )
}
