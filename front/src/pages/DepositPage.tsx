import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { LockIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastError } from '@/lib/api'
import { formatCredits } from '@/lib/cases'
import { formatEuros, listPacks, startCheckout, type Pack } from '@/lib/payments'
import { cn } from '@/lib/utils'

export function DepositPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [packs, setPacks] = useState<Pack[] | null>(null)
  const [selected, setSelected] = useState<string>('20')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    listPacks()
      .then(setPacks)
      .catch((err) => toastError(err, 'Impossible de charger les packs.'))
  }, [])

  if (user === null) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  const pack = packs?.find((p) => p.id === selected) ?? null

  const pay = async () => {
    if (!pack) return
    setPending(true)
    try {
      const { checkout_url } = await startCheckout(pack.id)
      window.location.assign(checkout_url)
    } catch (err) {
      toastError(err, 'Paiement impossible pour le moment.')
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold">Déposer des crédits</h1>
      <p className="mt-1 text-sm text-muted-foreground">1 crédit = 0,01 €. Paiement par carte bancaire.</p>

      <fieldset className="mt-8">
        <legend className="mb-3 text-sm font-medium">Montant</legend>
        {packs ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup">
            {packs.map((p) => {
              const active = p.id === selected
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(p.id)}
                  className={cn(
                    'flex flex-col items-start rounded-xl border bg-card px-4 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    active ? 'border-gold-500 bg-gold-400/10' : 'hover:border-gold-500/40',
                  )}
                >
                  <span className="text-xl font-semibold tabular-nums">{formatEuros(p.amount)}</span>
                  <span className={cn('mt-1 text-sm tabular-nums', active ? 'text-gold-300' : 'text-muted-foreground')}>
                    {formatCredits(p.credits)}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}
      </fieldset>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          {pack ? (
            <>
              <p>
                Tu paies <span className="font-semibold">{formatEuros(pack.amount)}</span>, tu reçois{' '}
                <span className="font-semibold text-gold-300">{formatCredits(pack.credits)}</span>.
              </p>
              {user && (
                <p className="mt-1 text-muted-foreground">
                  Solde après dépôt : {formatCredits(user.balance + pack.credits)}
                </p>
              )}
            </>
          ) : (
            <Skeleton className="h-5 w-56" />
          )}
        </div>
        <Button size="lg" className="h-11 px-6" onClick={pay} disabled={!pack || pending}>
          {pending ? 'Redirection…' : pack ? `Payer ${formatEuros(pack.amount)}` : 'Payer'}
        </Button>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <LockIcon className="size-3.5" aria-hidden />
        Paiement sur la page sécurisée de Stripe, avec 3D Secure. Le solde est crédité dès que Stripe confirme le paiement.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Les crédits ne sont ni remboursables ni convertibles en argent (
        <Link to="/terms" className="underline-offset-4 hover:underline">
          CGU
        </Link>
        ).
      </p>
    </div>
  )
}
