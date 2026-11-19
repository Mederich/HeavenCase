import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastError } from '@/lib/api'
import { formatCredits, listCases, parsePriceRange, type CaseSummary, type PriceRange } from '@/lib/cases'
import { CaseCard } from './CaseCard'
import { PriceFilter } from './PriceFilter'

const grid = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

function describeRange({ min, max }: PriceRange) {
  if (min !== undefined && max !== undefined) return `entre ${formatCredits(min)} et ${formatCredits(max)}`
  if (min !== undefined) return `à partir de ${formatCredits(min)}`
  return `jusqu'à ${formatCredits(max ?? 0)}`
}

export function CaseGrid() {
  const [searchParams, setSearchParams] = useSearchParams()
  const minParam = searchParams.get('min') ?? ''
  const maxParam = searchParams.get('max') ?? ''
  const parsed = useMemo(() => parsePriceRange(minParam, maxParam), [minParam, maxParam])
  const range = 'range' in parsed ? parsed.range : null
  const filtered = range !== null && (range.min !== undefined || range.max !== undefined)

  const [result, setResult] = useState<{ key: string; cases: CaseSummary[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const key = range ? `${range.min ?? ''}-${range.max ?? ''}` : null

  useEffect(() => {
    if (!range || key === null) return
    let active = true
    listCases(range)
      .then((list) => {
        if (!active) return
        setFailed(false)
        setResult({ key, cases: list })
      })
      .catch((err) => {
        if (!active) return
        setFailed(true)
        toastError(err, 'Impossible de charger les caisses.')
      })
    return () => {
      active = false
    }
    // range est dérivé de key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  function applyFilter(min: string, max: string) {
    const next = new URLSearchParams(searchParams)
    if (min) next.set('min', min)
    else next.delete('min')
    if (max) next.set('max', max)
    else next.delete('max')
    setSearchParams(next, { replace: true })
  }

  function resetFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('min')
    next.delete('max')
    setSearchParams(next, { replace: true })
  }

  const filter = (
    <PriceFilter
      key={`${minParam}|${maxParam}`}
      initialMin={minParam}
      initialMax={maxParam}
      initialErrors={'errors' in parsed ? parsed.errors : undefined}
      active={minParam !== '' || maxParam !== ''}
      onApply={applyFilter}
      onReset={resetFilter}
    />
  )

  return (
    <div className="space-y-8">
      {filter}
      <CaseResults
        failed={failed}
        cases={result && result.key === key ? result.cases : null}
        invalid={range === null}
        emptyMessage={filtered && range ? `Aucune caisse ${describeRange(range)}.` : 'Aucune caisse disponible.'}
        onReset={filtered ? resetFilter : undefined}
      />
    </div>
  )
}

interface CaseResultsProps {
  failed: boolean
  cases: CaseSummary[] | null
  invalid: boolean
  emptyMessage: string
  onReset?: () => void
}

function CaseResults({ failed, cases, invalid, emptyMessage, onReset }: CaseResultsProps) {
  if (invalid) return null

  if (failed) {
    return <p className="text-sm text-muted-foreground">Catalogue indisponible.</p>
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
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-border p-6">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            Réinitialiser les filtres
          </Button>
        )}
      </div>
    )
  }

  const sections: { name: string; cases: CaseSummary[] }[] = []
  for (const c of cases) {
    const name = c.category_name ?? 'Autres'
    const section = sections.find((s) => s.name === name)
    if (section) section.cases.push(c)
    else sections.push({ name, cases: [c] })
  }

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.name} aria-label={section.name}>
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">{section.name}</h2>
          <div className={grid}>
            {section.cases.map((c) => (
              <CaseCard key={c.id} item={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
