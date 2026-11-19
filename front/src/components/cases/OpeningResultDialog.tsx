import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCredits, rarityMeta, type OpeningResult } from '@/lib/cases'
import { cn } from '@/lib/utils'
import { ItemVisual, SkinName } from './ItemCard'

interface OpeningResultDialogProps {
  result: OpeningResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null : bouton masqué (solde insuffisant ou caisse indisponible). */
  onOpenAgain: (() => void) | null
  price: number
}

export function OpeningResultDialog({ result, open, onOpenChange, onOpenAgain, price }: OpeningResultDialogProps) {
  if (!result) return null
  const item = result.item
  const meta = rarityMeta[item.rarity]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-display text-2xl text-gold-gradient">Félicitations !</DialogTitle>
          <DialogDescription>Le skin a été ajouté à ton inventaire.</DialogDescription>
        </DialogHeader>

        <div className={cn('rounded-xl border-2 bg-card', meta.border)}>
          <ItemVisual item={item} className="aspect-[16/9] w-full" />
          <div className="space-y-1 p-4 text-center">
            <p className={cn('text-xs font-semibold tracking-wide uppercase', meta.text)}>{meta.label}</p>
            <SkinName name={item.name} className="[&>p:last-child]:font-display [&>p:last-child]:text-xl" />
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

        <DialogFooter className="gap-2 sm:justify-center">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {onOpenAgain && (
            <Button size="lg" onClick={onOpenAgain}>
              Rouvrir pour {formatCredits(price)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
