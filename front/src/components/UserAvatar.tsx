import { cn } from '@/lib/utils'

/** Initiale du pseudo dans un disque or. */
export function UserAvatar({ username, className }: { username: string; className?: string }) {
  const initial = username.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full bg-gold-400/15 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/40',
        className,
      )}
    >
      {initial}
    </span>
  )
}
