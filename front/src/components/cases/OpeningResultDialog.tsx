import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/api'
import { sellItem } from '@/lib/inventory'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { exteriorLabel, formatCredits, rarityMeta, type OpeningResult } from '@/lib/cases'
import { cn } from '@/lib/utils'
import { ItemCard, ItemVisual, SkinName } from './ItemCard'

interface OpeningResultDialogProps {
  results: OpeningResult[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null : bouton masqué (solde insuffisant ou caisse indisponible). */
  onOpenAgain: (() => void) | null
  /** Prix total d'une nouvelle ouverture du même nombre de caisses. */
  price: number
  /** Appelé avec le nouveau solde après la revente du skin gagné. */
  onSold: (balance: number) => void
}

type SaleState = 'idle' | 'confirm' | 'pending' | 'sold'

function SingleResult({ result }: { result: OpeningResult }) {
  const item = result.item
  const meta = rarityMeta[item.rarity]
  return (
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
  )
}

export function OpeningResultDialog(props: OpeningResultDialogProps) {
  if (props.results.length === 0) return null
  // Une clé par ouverture remet l'état de vente à zéro.
  return <ResultDialog key={props.results[0].opening_id} {...props} />
}

function ResultDialog({ results, open, onOpenChange, onOpenAgain, price, onSold }: OpeningResultDialogProps) {
  const [sale, setSale] = useState<SaleState>('idle')
  const multiple = results.length > 1
  const totalValue = results.reduce((sum, r) => sum + r.item.value, 0)
  const first = results[0]

  // Vend tous les skins gagnés, un par un (un seul appel d'API par skin).
  const confirmSale = async () => {
    setSale('pending')
    let sold = 0
    let amount = 0
    try {
      for (const r of results) {
        const done = await sellItem(r.inventory_item_id)
        sold += 1
        amount += done.amount
        onSold(done.balance_after)
      }
      setSale('sold')
      toast.success(
        multiple ? `${sold} skins vendus : +${formatCredits(amount)}` : `${results[0].item.name} vendu : +${formatCredits(amount)}`,
      )
    } catch (err) {
      // Les skins déjà vendus ne sont pas annulés : on revient à l'état initial.
      setSale('idle')
      toastError(err, sold > 0 ? `Vente interrompue après ${sold} skin(s).` : 'Vente impossible.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={multiple ? 'sm:max-w-3xl' : 'sm:max-w-md'}>
        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-display text-2xl text-gold-gradient">Félicitations !</DialogTitle>
          <DialogDescription>
            {sale === 'sold'
              ? `${multiple ? 'Skins vendus' : 'Skin vendu'} pour ${formatCredits(totalValue)}.`
              : multiple
                ? `${results.length} skins ajoutés à ton inventaire, valeur totale ${formatCredits(totalValue)}.`
                : 'Le skin a été ajouté à ton inventaire.'}
          </DialogDescription>
        </DialogHeader>

        {multiple ? (
          <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-5">
            {results.map((r) => (
              <ItemCard key={r.opening_id} item={r.item} showProbability={false} />
            ))}
          </div>
        ) : (
          <SingleResult result={first} />
        )}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Détails du tirage (provably fair)</summary>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt>Client seed</dt>
            <dd className="truncate text-foreground">{first.client_seed}</dd>
            <dt>Empreinte server seed</dt>
            <dd className="truncate font-mono text-foreground" title={first.server_seed_hash}>
              {first.server_seed_hash}
            </dd>
          </dl>
          <table className="mt-2 w-full text-left">
            <thead>
              <tr>
                <th className="font-normal">Nonce</th>
                <th className="font-normal">Ticket</th>
                {multiple && <th className="font-normal">Skin</th>}
              </tr>
            </thead>
            <tbody className="tabular-nums text-foreground">
              {results.map((r) => (
                <tr key={r.opening_id}>
                  <td>{r.nonce}</td>
                  <td>{r.ticket}</td>
                  {multiple && <td className="truncate">{r.item.name}</td>}
                </tr>
              ))}
            </tbody>
          </table>
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
                {multiple ? 'Tout vendre' : 'Vendre'} pour {formatCredits(totalValue)}
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
