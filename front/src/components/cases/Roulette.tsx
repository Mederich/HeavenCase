import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { rarityMeta, type LootEntry } from '@/lib/cases'
import { cn } from '@/lib/utils'
import { ItemCard, ItemVisual } from './ItemCard'

const GAP = 8
const STRIP_LENGTH = 60
const WINNER_INDEX = 52
/** Taille d'une carte dans le sens du défilement. */
const CARD_SIZE = { x: 144, y: 104 } as const

/** Tirage pondéré purement visuel, pour remplir la bande autour de l'objet gagné. */
function randomItem(items: LootEntry[]): LootEntry {
  const total = items.reduce((sum, i) => sum + i.drop_weight, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.drop_weight
    if (r < 0) return item
  }
  return items[items.length - 1]
}

/** Case compacte des roulettes verticales (ouverture multiple). */
function RollTile({ item }: { item: LootEntry }) {
  const meta = rarityMeta[item.rarity]
  return (
    <div className={cn('h-[104px] shrink-0 overflow-hidden rounded-lg border-b-4 bg-background/60', meta.border)}>
      <ItemVisual item={item} className="h-full w-full" />
    </div>
  )
}

interface RouletteProps {
  items: LootEntry[]
  /** Objet tiré par le serveur : la bande s'arrête toujours dessus. */
  winner: LootEntry
  /** Change à chaque ouverture pour relancer l'animation. */
  spinKey: string
  /** true : saute l'animation et se place directement sur le gagnant. */
  skip: boolean
  /** Horizontale pour une caisse, verticale pour plusieurs caisses côte à côte. */
  axis?: 'x' | 'y'
  durationMs?: number
  onDone: () => void
}

// Roulette cosmétique : le résultat est déjà enregistré par le serveur avant
// que l'animation ne démarre.
export function Roulette({ items, winner, spinKey, skip, axis = 'x', durationMs = 5500, onDone }: RouletteProps) {
  const strip = useMemo(() => {
    const list = Array.from({ length: STRIP_LENGTH }, () => randomItem(items))
    list[WINNER_INDEX] = winner
    return list
    // Une nouvelle bande par ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey])

  const card = CARD_SIZE[axis]
  const step = card + GAP
  const viewport = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [animated, setAnimated] = useState(false)
  const done = useRef(false)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  const finish = () => {
    if (done.current) return
    done.current = true
    onDoneRef.current()
  }

  const viewportSize = () => {
    const el = viewport.current
    if (!el) return 0
    return axis === 'x' ? el.clientWidth : el.clientHeight
  }

  // Position de départ, puis départ de l'animation à l'image suivante.
  useLayoutEffect(() => {
    done.current = false
    setAnimated(false)
    setOffset(0)
    // Petit décalage aléatoire pour ne pas toujours s'arrêter pile au centre de la carte.
    const jitter = (Math.random() - 0.5) * (card * 0.6)
    const target = WINNER_INDEX * step + card / 2 - viewportSize() / 2 + jitter
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frame = requestAnimationFrame(() => {
      setAnimated(!reduced)
      setOffset(target)
      if (reduced) finish()
    })
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey])

  // « Passer l'animation » : on se place sur le gagnant sans transition.
  useEffect(() => {
    if (!skip || done.current) return
    setAnimated(false)
    setOffset(WINNER_INDEX * step + card / 2 - viewportSize() / 2)
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip])

  const vertical = axis === 'y'

  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl border bg-card', vertical ? 'h-64 px-2' : 'py-6')}
      ref={viewport}
    >
      <div
        className={cn('flex gap-2 will-change-transform', vertical && 'flex-col')}
        style={{
          transform: vertical ? `translateY(${-offset}px)` : `translateX(${-offset}px)`,
          transition: animated ? `transform ${durationMs}ms cubic-bezier(0.1, 0.75, 0.15, 1)` : 'none',
        }}
        onTransitionEnd={finish}
        aria-hidden
      >
        {strip.map((item, i) =>
          vertical ? (
            <RollTile key={i} item={item} />
          ) : (
            <ItemCard key={i} item={item} showProbability={false} className="w-36 shrink-0" />
          ),
        )}
      </div>
      {/* Repère central */}
      {vertical ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-gold-400 shadow-[0_0_12px_2px] shadow-gold-400/60" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-card to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gold-400 shadow-[0_0_12px_2px] shadow-gold-400/60" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent" />
        </>
      )}
    </div>
  )
}
