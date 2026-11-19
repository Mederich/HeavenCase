import chest from '@/assets/case-chest.jpg'
import { chestTint } from '@/lib/cases'
import { cn } from '@/lib/utils'

interface CaseVisualProps {
  name: string
  price: number
  imageUrl: string | null
  className?: string
}

// Visuel d'une caisse : son image si l'API en fournit une, sinon le coffre
// HeavenCases teinté selon le prix.
export function CaseVisual({ name, price, imageUrl, className }: CaseVisualProps) {
  return (
    <img
      src={imageUrl ?? chest}
      alt={name}
      loading="lazy"
      className={cn('aspect-[22/15] w-full object-cover', !imageUrl && chestTint(price), className)}
    />
  )
}
