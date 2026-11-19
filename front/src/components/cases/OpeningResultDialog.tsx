import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/api'
import { sellItem } from '@/lib/inventory'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { exteriorLabel, formatCredits, rarityMeta, type OpeningResult } from '@/lib/cases'
import { cn } from '@/lib/utils'
import { ItemVisual, SkinName } from './ItemCard'

interface OpeningResultDialogProps {
  result: OpeningResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null : bouton masqué (solde insuffisant ou caisse indisponible). */
  onOpenAgain: (() => void) | null
  price: number
  /** Appelé avec le nouveau solde après la revente du skin gagné. */
  onSold: (balance: number) => void
}

export function OpeningResultDialog(props: OpeningResultDialogProps) {
  if (!props.result) return null
  // Une clé par ouverture remet l'état de vente à zéro.
  return <ResultDialog key={props.result.opening_id} {...props} result={props.result} />
}

type SaleState = 'idle' | 'confirm' | 'pending' | 'sold'

function ResultDialog({
  result,
  open,
  onOpenChange,
  onOpenAgain,
  price,
  onSold,
}: OpeningResultDialogProps & { result: OpeningResult }) {
  const [sale, setSale] = useState<SaleState>('idle')
  const item = result.item
  const meta = rarityMeta[item.rarity]

  const confirmSale = async () => {
    setSale('pending')
    try {
      const done = await sellItem(result.inventory_item_id)
      setSale('sold')
      toast.success(`${done.item_name} vendu : +${formatCredits(done.amount)}`)
      onSold(done.balance_after)
    } catch (err) {
      setSale('idle')
      toastError(err, 'Vente impossible.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-display text-2xl text-gold-gradient">Félicitations !</DialogTitle>
          <DialogDescription>
            {sale === 'sold' ? `Skin vendu pour ${formatCredits(item.value)}.` : 'Le skin a été ajouté à ton inventaire.'}
          </DialogDescription>
        </DialogHeader>

        <div className={cn('rounded-xl border-2 bg-card', meta.border)}>
          <ItemVisual item={item} className="aspect-[16/9] w-full" />
          <div className="space-y-1 p-4 text-center">
            <p className={cn('text-xs font-semibold tracking-wide uppercase', meta.text)}>
              {meta.label}
              {item.exterior && <span className="text-muted-foreground"> · {exteriorLabel[item.exterior]}</span>}
            </p>
            <SkinName item={item} className="[&>p:last-child]:font-display [&>p:last-child]:text-xl" />
            <p className="text-lg font-semibold tabular-nums text-gold-300">{formatCredits(item.value)}</p>
          </div>
        </div>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Détails du tirage (provably fair)</summary>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt>Ticket</dt>
            <dd className="tabular-nums text-foreground">{result.ticket}</dd>
            <dt>Nonce</dt>
            <dd className="tabular-nums text-foreground">{result.nonce}</dd>
            <dt>Client seed</dt>
            <dd className="truncate text-foreground">{result.client_seed}</dd>
            <dt>Empreinte server seed</dt>
            <dd className="truncate font-mono text-foreground" title={result.server_seed_hash}>
              {result.server_seed_hash}
            </dd>
          </dl>
        </details>

        {sale === 'confirm' || sale === 'pending' ? (
          <DialogFooter className="gap-2 sm:justify-center">
            <Button variant="outline" size="lg" onClick={() => setSale('idle')} disabled={sale === 'pending'}>
              Annuler
            </Button>
            <Button size="lg" onClick={confirmSale} disabled={sale === 'pending'}>
              Confirmer la vente
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="gap-2 sm:justify-center">
            {sale === 'idle' && (
              <Button variant="outline" size="lg" onClick={() => setSale('confirm')}>
                Vendre pour {formatCredits(item.value)}
              </Button>
            )}
            {onOpenAgain ? (
              <Button size="lg" onClick={onOpenAgain}>
                Rouvrir pour {formatCredits(price)}
              </Button>
            ) : (
              <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
