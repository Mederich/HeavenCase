// Types et appels de l'API caisses (back/src/catalog.rs, back/src/opening.rs).
import { api } from './api'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface CaseSummary {
  id: string
  name: string
  slug: string
  image_url: string | null
  description: string | null
  /** Prix en crédits. */
  price: number
}

export interface LootEntry {
  item_id: string
  name: string
  image_url: string | null
  rarity: Rarity
  /** Valeur en crédits. */
  value: number
  /** Poids en millièmes de pourcent (100 000 = 100 %). */
  drop_weight: number
  /** Probabilité en pourcent. */
  probability: number
  roll_min: number
  roll_max: number
}

export interface CaseDetail extends CaseSummary {
  /** Du plus rare au plus commun. */
  items: LootEntry[]
  is_openable: boolean
}

export function listCases() {
  return api<CaseSummary[]>('/cases')
}

export function getCase(slug: string) {
  return api<CaseDetail>(`/cases/${encodeURIComponent(slug)}`)
}

const credits = new Intl.NumberFormat('fr-FR')

export function formatCredits(value: number) {
  return `${credits.format(value)} crédits`
}

const percent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })

export function formatProbability(probability: number) {
  return `${percent.format(probability)} %`
}

export const rarityMeta: Record<Rarity, { label: string; text: string; border: string; glow: string; bg: string }> = {
  common: {
    label: 'Commun',
    text: 'text-slate-300',
    border: 'border-slate-400/40',
    glow: 'from-slate-400/25',
    bg: 'bg-slate-400/10',
  },
  rare: {
    label: 'Rare',
    text: 'text-sky-300',
    border: 'border-sky-400/50',
    glow: 'from-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  epic: {
    label: 'Épique',
    text: 'text-violet-300',
    border: 'border-violet-400/50',
    glow: 'from-violet-500/35',
    bg: 'bg-violet-500/10',
  },
  legendary: {
    label: 'Légendaire',
    text: 'text-gold-300',
    border: 'border-gold-400/60',
    glow: 'from-gold-500/40',
    bg: 'bg-gold-500/10',
  },
  mythic: {
    label: 'Mythique',
    text: 'text-rose-300',
    border: 'border-rose-400/60',
    glow: 'from-rose-500/40',
    bg: 'bg-rose-500/10',
  },
}

/**
 * Teinte du coffre selon le prix, pour distinguer les caisses tant que l'API
 * ne fournit pas de visuel propre (image_url).
 */
export function chestTint(price: number): string {
  if (price <= 50) return 'grayscale-70 brightness-110'
  if (price <= 100) return 'hue-rotate-[175deg] saturate-150'
  if (price <= 250) return 'hue-rotate-[120deg] saturate-125'
  if (price <= 500) return ''
  if (price <= 1000) return 'hue-rotate-[335deg] saturate-150'
  if (price <= 2500) return 'hue-rotate-[230deg] saturate-125'
  if (price <= 5000) return 'hue-rotate-[270deg] saturate-150'
  return 'hue-rotate-[310deg] saturate-150'
}

/** Réponse de POST /cases/{slug}/open : le tirage est déjà enregistré côté serveur. */
export interface OpeningResult {
  opening_id: string
  case_slug: string
  item: LootEntry
  inventory_item_id: string
  /** Ticket tiré, entre 0 et 99 999. */
  ticket: number
  nonce: number
  server_seed_hash: string
  client_seed: string
  price_paid: number
  balance_after: number
}

export function openCase(slug: string) {
  return api<OpeningResult>(`/cases/${encodeURIComponent(slug)}/open`, { method: 'POST' })
}
