// Données d'exemple pour Storybook, au format de l'API (back/src/catalog.rs).
import type { CaseSummary, LootEntry, OpeningResult } from '@/lib/cases'

export const caseSummary: CaseSummary = {
  id: '0b6f5c1e-3a52-4c8e-9f0e-6a1d2b3c4d5e',
  name: 'Redline',
  slug: 'redline',
  image_url: null,
  description: null,
  price: 250,
  category_name: 'Fusils',
  category_slug: 'fusils',
}

function entry(partial: Partial<LootEntry> & Pick<LootEntry, 'name' | 'rarity' | 'value' | 'probability'>): LootEntry {
  return {
    item_id: partial.name,
    image_url: null,
    exterior: 'FT',
    stattrak: false,
    drop_weight: Math.round(partial.probability * 1000),
    roll_min: 0,
    roll_max: 0,
    ...partial,
  }
}

export const lootTable: LootEntry[] = [
  entry({ name: '★ Karambit | Fade', rarity: 'mythic', value: 98000, probability: 0.15, exterior: 'FN' }),
  entry({ name: 'AWP | Asiimov', rarity: 'legendary', value: 9500, probability: 0.85, exterior: 'FT' }),
  entry({ name: 'AK-47 | Redline', rarity: 'epic', value: 2400, probability: 4, stattrak: true, exterior: 'MW' }),
  entry({ name: 'M4A1-S | Decimator', rarity: 'rare', value: 600, probability: 20, exterior: 'WW' }),
  entry({ name: 'Glock-18 | Water Elemental', rarity: 'common', value: 90, probability: 75, exterior: 'BS' }),
]

export const openingResult: OpeningResult = {
  opening_id: '7d0c2a9b-1f4e-4b8a-a6c3-2e5f7a9b0c1d',
  case_slug: caseSummary.slug,
  item: lootTable[2],
  inventory_item_id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
  ticket: 4217,
  nonce: 12,
  server_seed_hash: 'f3a9c1d2e4b5a6978869a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6',
  client_seed: 'heaven',
  price_paid: 250,
  balance_after: 4750,
}
