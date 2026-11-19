// Types et appels de l'API inventaire (back/src/inventory.rs).
import { api } from './api'
import type { Exterior, Rarity } from './cases'

export type InventoryStatus = 'owned' | 'sold' | 'withdrawn' | 'upgraded'

export interface InventoryEntry {
  /** Id de la ligne d'inventaire. */
  id: string
  item_id: string
  name: string
  image_url: string | null
  rarity: Rarity
  /** Valeur de revente en crédits. */
  value: number
  exterior: Exterior | null
  stattrak: boolean
  status: InventoryStatus
  case_name: string | null
  case_slug: string | null
  /** Date d'obtention, ISO 8601. */
  acquired_at: string
}

export const statusLabel: Record<InventoryStatus, string> = {
  owned: 'Disponible',
  sold: 'Vendu',
  withdrawn: 'Retiré',
  upgraded: 'Utilisé',
}

export function listInventory(status: 'owned' | 'sold' | 'all' = 'owned') {
  return api<InventoryEntry[]>(`/inventory?status=${status}`)
}

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso))
}
