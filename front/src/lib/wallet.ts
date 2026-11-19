// Historique des crédits (back/src/wallet.rs).
import { api } from './api'

export type TransactionType = 'deposit' | 'case_open' | 'item_sell' | 'withdrawal' | 'bonus' | 'refund'

export interface TransactionEntry {
  id: string
  type: TransactionType
  /** Montant signé en crédits. */
  amount: number
  balance_after: number
  /** Caisse achetée ou skin vendu. */
  detail: string | null
  /** ISO 8601. */
  created_at: string
}

export interface TransactionPage {
  items: TransactionEntry[]
  total: number
  page: number
  per_page: number
}

export const transactionLabel: Record<TransactionType, string> = {
  deposit: 'Dépôt',
  case_open: 'Achat caisse',
  item_sell: 'Revente objet',
  withdrawal: 'Retrait',
  bonus: 'Bonus',
  refund: 'Remboursement',
}

export function listTransactions(page: number, perPage = 20) {
  return api<TransactionPage>(`/transactions?page=${page}&per_page=${perPage}`)
}
