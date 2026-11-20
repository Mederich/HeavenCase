// Dépôt de crédits par carte (back/src/payments.rs).
import { api } from './api'

export interface Pack {
  id: string
  /** Prix en centimes d'euro. */
  amount: number
  credits: number
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Payment {
  id: string
  status: PaymentStatus
  amount: number
  credits: number | null
  failure_reason: string | null
  created_at: string
}

export function listPacks() {
  return api<Pack[]>('/payments/packs')
}

export function startCheckout(pack: string) {
  return api<{ payment_id: string; checkout_url: string }>('/payments/checkout', {
    method: 'POST',
    body: { pack },
  })
}

export function getPayment(id: string) {
  return api<Payment>(`/payments/${encodeURIComponent(id)}`)
}

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export function formatEuros(cents: number) {
  return euros.format(cents / 100)
}
