import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ItemVisual } from '@/components/cases/ItemCard'
import { toastError } from '@/lib/api'
import { exteriorLabel, formatCredits } from '@/lib/cases'
import { sellItem, type InventoryEntry, type SaleResult } from '@/lib/inventory'

interface SellDialogProps {
  /** Skin à vendre ; null ferme la modale. */
  entry: InventoryEntry | null
  onClose: () => void
  onSold: (sale: SaleResult) => void
}

export function SellDialog({ entry, onClose, onSold }: SellDialogProps) {
  const [pending, setPending] = useState(false)

  const confirm = async () => {
    if (!entry) return
    setPending(true)
    try {
      const sale = await sellItem(entry.id)
      toast.success(`${sale.item_name} vendu : +${formatCredits(sale.amount)}`)
      onSold(sale)
      onClose()
    } catch (err) {
      toastError(err, 'Vente impossible.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle>Vendre ce skin ?</DialogTitle>
              <DialogDescription>
                {entry.stattrak && 'StatTrak™ '}
                {entry.name}
                {entry.exterior && ` (${exteriorLabel[entry.exterior]})`}
              </DialogDescription>
            </DialogHeader>
            <ItemVisual item={entry} className="aspect-[16/9] w-full rounded-lg bg-card" />
            <p className="text-sm">
              Tu reçois <span className="font-semibold tabular-nums text-gold-300">{formatCredits(entry.value)}</span>.
              La vente est définitive.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Annuler
              </Button>
              <Button onClick={confirm} disabled={pending}>
                Vendre pour {formatCredits(entry.value)}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
