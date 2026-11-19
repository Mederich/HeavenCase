import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { toastError } from '@/lib/api'
import { listCases, type CaseSummary } from '@/lib/cases'
import { CaseCard } from './CaseCard'

const grid = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

export function CaseGrid() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    listCases()
      .then((list) => active && setCases(list))
      .catch((err) => {
        if (!active) return
        setFailed(true)
        toastError(err, 'Impossible de charger les caisses.')
      })
    return () => {
      active = false
    }
  }, [])

  if (failed) {
    return <p className="text-sm text-muted-foreground">Le catalogue est indisponible pour le moment.</p>
  }

  if (!cases) {
    return (
      <div className={grid} aria-busy="true" aria-label="Chargement des caisses">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-[22/22] rounded-xl" />
        ))}
      </div>
    )
  }

  if (cases.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune caisse disponible pour le moment.</p>
  }

  return (
    <div className={grid}>
      {cases.map((c) => (
        <CaseCard key={c.id} item={c} />
      ))}
    </div>
  )
}
