import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CircleCheckIcon, CircleXIcon, LoaderCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/api'
import { formatCredits } from '@/lib/cases'
import { getPayment, type Payment } from '@/lib/payments'

const POLL_MS = 2000
const MAX_POLLS = 30

type View = 'cancelled' | 'waiting' | 'slow' | 'completed' | 'failed' | 'error'

export function DepositReturnPage() {
  const [params] = useSearchParams()
  const paymentId = params.get('payment')
  const cancelled = params.get('status') === 'cancel'
  const { refresh } = useAuth()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [view, setView] = useState<View>(cancelled ? 'cancelled' : 'waiting')

  useEffect(() => {
    if (cancelled || !paymentId) return
    let active = true
    let polls = 0
    let timer: ReturnType<typeof setTimeout>

    // Le retour navigateur ne crédite rien : on attend la confirmation du webhook.
    const poll = async () => {
      try {
        const p = await getPayment(paymentId)
        if (!active) return
        setPayment(p)
        if (p.status === 'completed') {
          setView('completed')
          void refresh()
          return
        }
        if (p.status === 'failed') {
          setView('failed')
          return
        }
      } catch (err) {
        if (!active) return
        setView('error')
        toastError(err, 'Impossible de vérifier le paiement.')
        return
      }
      polls += 1
      if (polls >= MAX_POLLS) setView('slow')
      else timer = setTimeout(poll, POLL_MS)
    }
    void poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [cancelled, paymentId, refresh])

  const content: Record<View, { icon: React.ReactNode; title: string; text: string }> = {
    cancelled: {
      icon: <CircleXIcon className="size-10 text-muted-foreground" />,
      title: 'Paiement annulé',
      text: 'Aucun montant n’a été débité.',
    },
    waiting: {
      icon: <LoaderCircleIcon className="size-10 animate-spin text-gold-400 motion-reduce:animate-none" />,
      title: 'Confirmation du paiement…',
      text: 'Stripe confirme le paiement, cela prend quelques secondes.',
    },
    slow: {
      icon: <LoaderCircleIcon className="size-10 text-gold-400" />,
      title: 'Confirmation en attente',
      text: 'La confirmation prend plus de temps que prévu. Le solde sera crédité dès que Stripe l’aura envoyée.',
    },
    completed: {
      icon: <CircleCheckIcon className="size-10 text-success" />,
      title: 'Dépôt confirmé',
      text: payment?.credits ? `${formatCredits(payment.credits)} ajoutés à ton solde.` : 'Ton solde a été crédité.',
    },
    failed: {
      icon: <CircleXIcon className="size-10 text-destructive" />,
      title: 'Paiement refusé',
      text: payment?.failure_reason ?? 'Le paiement n’a pas abouti. Aucun crédit n’a été ajouté.',
    },
    error: {
      icon: <CircleXIcon className="size-10 text-destructive" />,
      title: 'Paiement introuvable',
      text: 'Vérifie ton historique de transactions.',
    },
  }
  const { icon, title, text } = content[paymentId || cancelled ? view : 'error']

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center" aria-live="polite">
      {icon}
      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <div className="mt-8 flex gap-3">
        {view === 'completed' ? (
          <Button asChild>
            <Link to="/cases">Ouvrir une caisse</Link>
          </Button>
        ) : (
          view !== 'waiting' && (
            <Button asChild>
              <Link to="/deposit">{view === 'cancelled' || view === 'failed' ? 'Réessayer' : 'Nouveau dépôt'}</Link>
            </Button>
          )
        )}
        <Button asChild variant="outline">
          <Link to="/profile?tab=history">Transactions</Link>
        </Button>
      </div>
    </div>
  )
}
