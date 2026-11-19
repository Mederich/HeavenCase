// Types et appels de l'API caisses (back/src/catalog.rs, back/src/opening.rs).
import { api } from './api'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type Exterior = 'FN' | 'MW' | 'FT' | 'WW' | 'BS'

export const exteriorLabel: Record<Exterior, string> = {
  FN: 'Factory New',
  MW: 'Minimal Wear',
  FT: 'Field-Tested',
  WW: 'Well-Worn',
  BS: 'Battle-Scarred',
}

export interface CaseSummary {
  id: string
  name: string
  slug: string
  image_url: string | null
  description: string | null
  /** Prix en crédits. */
  price: number
  category_name: string | null
  category_slug: string | null
}

export interface LootEntry {
  item_id: string
  name: string
  image_url: string | null
  rarity: Rarity
  /** Valeur en crédits. */
  value: number
  /** Usure : FN, MW, FT, WW ou BS. */
  exterior: Exterior | null
  stattrak: boolean
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

/**
 * Grades CS2 associés aux raretés de l'API : common = Mil-Spec,
 * rare = Restricted, epic = Classified, legendary = Covert,
 * mythic = ★ (couteaux et gants).
 */
export const rarityMeta: Record<Rarity, { label: string; text: string; border: string; glow: string; bg: string }> = {
  common: {
    label: 'Mil-Spec',
    text: 'text-grade-milspec',
    border: 'border-grade-milspec/60',
    glow: 'from-grade-milspec/30',
    bg: 'bg-grade-milspec/15',
  },
  rare: {
    label: 'Restricted',
    text: 'text-grade-restricted',
    border: 'border-grade-restricted/60',
    glow: 'from-grade-restricted/35',
    bg: 'bg-grade-restricted/15',
  },
  epic: {
    label: 'Classified',
    text: 'text-grade-classified',
    border: 'border-grade-classified/60',
    glow: 'from-grade-classified/35',
    bg: 'bg-grade-classified/15',
  },
  legendary: {
    label: 'Covert',
    text: 'text-grade-covert',
    border: 'border-grade-covert/60',
    glow: 'from-grade-covert/40',
    bg: 'bg-grade-covert/15',
  },
  mythic: {
    label: '★ Rare Special',
    text: 'text-grade-special',
    border: 'border-grade-special/70',
    glow: 'from-grade-special/45',
    bg: 'bg-grade-special/15',
  },
}

/** Sépare « AK-47 | Redline » en arme et nom du skin. */
export function splitSkinName(name: string): { weapon: string; skin: string | null } {
  const [weapon, ...rest] = name.split(' | ')
  return { weapon, skin: rest.length ? rest.join(' | ') : null }
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
