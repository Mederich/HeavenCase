import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ArrowLeftIcon, ShieldCheckIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { OpeningResultDialog } from '@/components/cases/OpeningResultDialog'
import { Roulette } from '@/components/cases/Roulette'
import { CaseVisual } from '@/components/cases/CaseVisual'
import { ItemCard } from '@/components/cases/ItemCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ApiError, toastError } from '@/lib/api'
import { OPEN_COUNTS, formatCredits, getCase, openCase, type CaseDetail, type OpeningResult } from '@/lib/cases'
import { cn } from '@/lib/utils'

const FAST_MODE_KEY = 'heavencase:fast-mode'
const DURATION_MS = { normal: 5500, fast: 1500 }

/** Colonnes de la grille selon le nombre de caisses (classes statiques pour Tailwind). */
const gridCols: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-3 sm:grid-cols-5',
  10: 'grid-cols-3 sm:grid-cols-5',
}

function readFastMode() {
  try {
    return localStorage.getItem(FAST_MODE_KEY) === '1'
  } catch {
    return false
  }
}

type State = { status: 'loading' } | { status: 'ready'; data: CaseDetail } | { status: 'missing' } | { status: 'failed' }

function BackLink() {
  return (
    <Link to="/cases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold-300">
      <ArrowLeftIcon className="size-4" /> Retour aux caisses
    </Link>
  )
}

function Unavailable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold text-gold-gradient">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{children}</p>
      <Button asChild variant="outline" size="lg" className="mt-8">
        <Link to="/cases">Retour aux caisses</Link>
      </Button>
    </div>
  )
}

export function CaseDetailPage() {
  const { slug = '' } = useParams()
  const { user, setBalance } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [count, setCount] = useState(1)
  const [fast, setFast] = useState(readFastMode)
  const [openings, setOpenings] = useState<OpeningResult[]>([])
  const [pending, setPending] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const finished = useRef(0)
  const [skip, setSkip] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    getCase(slug)
      .then((data) => active && setState({ status: 'ready', data }))
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: 'missing' })
        } else {
          setState({ status: 'failed' })
          toastError(err, 'Impossible de charger la caisse.')
        }
      })
    return () => {
      active = false
    }
  }, [slug])

  if (state.status === 'missing') {
    return (
      <Unavailable title="Caisse introuvable">Cette caisse n’existe pas ou n’est plus disponible.</Unavailable>
    )
  }
  if (state.status === 'failed') {
    return <Unavailable title="Caisse indisponible">Le contenu de la caisse n’a pas pu être chargé.</Unavailable>
  }

  if (state.status === 'loading') {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="aspect-[22/15] rounded-2xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const data = state.data
  const totalPrice = data.price * count
  const missing = user ? Math.max(0, totalPrice - user.balance) : 0
  const canOpen = Boolean(user) && data.is_openable && missing === 0 && !pending && !spinning

  const handleOpen = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    setResultOpen(false)
    setPending(true)
    try {
      const results = await openCase(data.slug, count)
      finished.current = 0
      setOpenings(results)
      setSkip(false)
      setSpinning(true)
      stage.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Le solde affiché dans le header suit le débit.
      setBalance(results[results.length - 1].balance_after)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toastError(err, 'Connecte-toi pour ouvrir une caisse.')
        navigate('/login', { state: { from: location.pathname } })
      } else {
        toastError(err, 'Ouverture impossible.')
      }
    } finally {
      setPending(false)
    }
  }

  // Le résultat s'affiche quand toutes les roulettes sont arrêtées.
  const handleSpinDone = () => {
    finished.current += 1
    if (finished.current < openings.length) return
    setSpinning(false)
    setResultOpen(true)
  }

  const toggleFast = (checked: boolean) => {
    setFast(checked)
    try {
      localStorage.setItem(FAST_MODE_KEY, checked ? '1' : '0')
    } catch {
      // Préférence non conservée, sans conséquence.
    }
  }

  const durationMs = fast ? DURATION_MS.fast : DURATION_MS.normal
  const spinKey = openings[0]?.opening_id
  const values = data.items.map((i) => i.value)
  const total = data.items.reduce((sum, i) => sum + i.drop_weight, 0) / 1000

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <BackLink />

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div ref={stage} className="min-w-0 scroll-mt-24 space-y-4">
          {openings.length > 0 ? (
            <section className="space-y-4" aria-live="polite">
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-gold-gradient">{data.name}</h1>
                <p className="truncate text-sm text-muted-foreground">
                  {spinning
                    ? 'Ouverture en cours…'
                    : openings.length === 1
                      ? `Obtenu : ${openings[0].item.name}`
                      : `Obtenu : ${formatCredits(openings.reduce((sum, o) => sum + o.item.value, 0))}`}
                </p>
              </div>
              {openings.length === 1 ? (
                <Roulette
                  items={data.items}
                  winner={openings[0].item}
                  spinKey={openings[0].opening_id}
                  skip={skip}
                  durationMs={durationMs}
                  onDone={handleSpinDone}
                />
              ) : (
                <div className={cn('grid gap-2', gridCols[openings.length])}>
                  {openings.map((o) => (
                    <Roulette
                      key={`${spinKey}-${o.opening_id}`}
                      axis="y"
                      items={data.items}
                      winner={o.item}
                      spinKey={o.opening_id}
                      skip={skip}
                      durationMs={durationMs}
                      onDone={handleSpinDone}
                    />
                  ))}
                </div>
              )}
              {spinning && (
                <div className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => setSkip(true)}>
                    Passer l’animation
                  </Button>
                </div>
              )}
            </section>
          ) : count === 1 ? (
            <section className="relative overflow-hidden rounded-2xl border bg-card">
              <CaseVisual name={data.name} price={data.price} imageUrl={data.image_url} className="max-h-[26rem]" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h1 className="font-display text-3xl font-bold text-gold-gradient sm:text-4xl">{data.name}</h1>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-gold-300">{formatCredits(data.price)}</p>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-gold-gradient">{data.name}</h1>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {count} × {formatCredits(data.price)}
                </p>
              </div>
              <div className={cn('grid gap-2 rounded-2xl border bg-card p-2', gridCols[count])}>
                {Array.from({ length: count }, (_, i) => (
                  <CaseVisual
                    key={i}
                    name={data.name}
                    price={data.price}
                    imageUrl={data.image_url}
                    className="rounded-lg"
                  />
                ))}
              </div>
            </section>
          )}

          {user !== null && (
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border bg-card p-3">
              <ToggleGroup
                type="single"
                variant="outline"
                value={String(count)}
                onValueChange={(v) => {
                  if (!v) return
                  setCount(Number(v))
                  setOpenings([])
                }}
                disabled={pending || spinning}
                aria-label="Nombre de caisses"
              >
                {OPEN_COUNTS.map((n) => (
                  <ToggleGroupItem
                    key={n}
                    value={String(n)}
                    className="h-11 min-w-11 tabular-nums data-[state=on]:border-gold-400 data-[state=on]:text-gold-300"
                  >
                    {n}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Button size="lg" className="h-11 min-w-56" onClick={handleOpen} disabled={!canOpen}>
                {pending ? 'Ouverture…' : `Ouvrir pour ${formatCredits(totalPrice)}`}
              </Button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={fast} onCheckedChange={toggleFast} />
                Mode rapide
              </label>
            </div>
          )}
          {user !== null && missing > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Solde insuffisant : il te manque {formatCredits(missing)}.{' '}
              <Link to="/deposit" className="font-medium text-gold-300 hover:underline">
                Déposer
              </Link>
            </p>
          )}
        </div>

        <Card className="gap-4 self-start">
          <CardContent className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Informations</h2>
            {data.description && <p className="text-sm text-muted-foreground">{data.description}</p>}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Skins dans la caisse</dt>
                <dd className="font-medium tabular-nums">{data.items.length}</dd>
              </div>
              {values.length > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Valeurs</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {formatCredits(Math.min(...values))} – {formatCredits(Math.max(...values))}
                  </dd>
                </div>
              )}
            </dl>
            {user === null && (
              <Button asChild size="lg" className="h-11 w-full">
                <Link to="/login" state={{ from: location.pathname }}>
                  Se connecter pour ouvrir
                </Link>
              </Button>
            )}
            {data.is_openable ? (
              <Badge variant="outline" className="border-success/40 text-success">
                <ShieldCheckIcon /> Probabilités vérifiables (provably fair)
              </Badge>
            ) : (
              <p className="text-sm text-destructive">Cette caisse est momentanément indisponible.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-10" aria-labelledby="case-content">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="case-content" className="font-display text-xl font-bold text-foreground">
            Contenu de la caisse
          </h2>
          <p className="text-xs text-muted-foreground">
            Total des probabilités : {total.toLocaleString('fr-FR')} %
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.items.map((item) => (
            <ItemCard key={item.item_id} item={item} />
          ))}
        </div>
      </section>

      <OpeningResultDialog
        results={openings}
        open={resultOpen}
        onOpenChange={setResultOpen}
        price={totalPrice}
        onSold={setBalance}
        onOpenAgain={user && data.is_openable && missing === 0 ? handleOpen : null}
      />
    </div>
  )
}
