import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toastError } from '@/lib/api'
import { formatDateTime } from '@/lib/inventory'
import { listTransactions, transactionLabel, type TransactionPage } from '@/lib/wallet'
import { cn } from '@/lib/utils'

const PER_PAGE = 20
const credits = new Intl.NumberFormat('fr-FR', { signDisplay: 'exceptZero' })
const plain = new Intl.NumberFormat('fr-FR')

export function TransactionsPanel() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<TransactionPage | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    listTransactions(page, PER_PAGE)
      .then((res) => {
        if (!active) return
        setFailed(false)
        setData(res)
      })
      .catch((err) => {
        if (!active) return
        setFailed(true)
        toastError(err, "Impossible de charger l'historique.")
      })
    return () => {
      active = false
    }
  }, [page])

  if (failed) return <p className="text-sm text-muted-foreground">Historique indisponible.</p>

  const current = data?.page === page ? data : null
  if (!current) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Chargement de l'historique">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    )
  }

  if (current.total === 0) {
    return <p className="rounded-xl border p-6 text-sm text-muted-foreground">Aucune transaction.</p>
  }

  const pages = Math.max(1, Math.ceil(current.total / current.per_page))

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Détail</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Solde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.items.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  <time dateTime={t.created_at}>{formatDateTime(t.created_at)}</time>
                </TableCell>
                <TableCell className="whitespace-nowrap">{transactionLabel[t.type] ?? t.type}</TableCell>
                <TableCell className="max-w-64 truncate" title={t.detail ?? undefined}>
                  {t.detail ?? '–'}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-semibold whitespace-nowrap tabular-nums',
                    t.amount > 0 ? 'text-success' : 'text-foreground',
                  )}
                >
                  {credits.format(t.amount)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums text-muted-foreground">
                  {plain.format(t.balance_after)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
          <Button variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page} / {pages}
          </span>
          <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>
            Suivant
          </Button>
        </nav>
      )}
    </div>
  )
}
