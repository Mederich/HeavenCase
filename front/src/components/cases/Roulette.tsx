import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LootEntry } from '@/lib/cases'
import { ItemCard } from './ItemCard'

const CARD_WIDTH = 144
const GAP = 8
const STEP = CARD_WIDTH + GAP
const STRIP_LENGTH = 60
const WINNER_INDEX = 52
const DURATION_MS = 5500

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

interface RouletteProps {
  items: LootEntry[]
  /** Objet tiré par le serveur : la bande s'arrête toujours dessus. */
  winner: LootEntry
  /** Change à chaque ouverture pour relancer l'animation. */
  spinKey: string
  /** true : saute l'animation et se place directement sur le gagnant. */
  skip: boolean
  onDone: () => void
}

// Roulette cosmétique : le résultat est déjà enregistré par le serveur avant
// que l'animation ne démarre.
export function Roulette({ items, winner, spinKey, skip, onDone }: RouletteProps) {
  const strip = useMemo(() => {
    const list = Array.from({ length: STRIP_LENGTH }, () => randomItem(items))
    list[WINNER_INDEX] = winner
    return list
    // Une nouvelle bande par ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey])

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

  // Position de départ, puis départ de l'animation à l'image suivante.
  useLayoutEffect(() => {
    done.current = false
    setAnimated(false)
    setOffset(0)
    const width = viewport.current?.clientWidth ?? 0
    // Petit décalage aléatoire pour ne pas toujours s'arrêter pile au centre de la carte.
    const jitter = (Math.random() - 0.5) * (CARD_WIDTH * 0.6)
    const target = WINNER_INDEX * STEP + CARD_WIDTH / 2 - width / 2 + jitter
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frame = requestAnimationFrame(() => {
      setAnimated(!reduced)
      setOffset(target)
      if (reduced) finish()
    })
    return () => cancelAnimationFrame(frame)
     
  }, [spinKey])

  // « Passer l'animation » : on se place sur le gagnant sans transition.
  useEffect(() => {
    if (!skip || done.current) return
    const width = viewport.current?.clientWidth ?? 0
    setAnimated(false)
    setOffset(WINNER_INDEX * STEP + CARD_WIDTH / 2 - width / 2)
    finish()
     
  }, [skip])

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card py-6" ref={viewport}>
      <div
        className="flex gap-2 will-change-transform"
        style={{
          transform: `translateX(${-offset}px)`,
          transition: animated ? `transform ${DURATION_MS}ms cubic-bezier(0.1, 0.75, 0.15, 1)` : 'none',
        }}
        onTransitionEnd={finish}
        aria-hidden
      >
        {strip.map((item, i) => (
          <ItemCard key={i} item={item} showProbability={false} className="w-36 shrink-0" />
        ))}
      </div>
      {/* Repère central */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gold-400 shadow-[0_0_12px_2px] shadow-gold-400/60" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent" />
    </div>
  )
}
