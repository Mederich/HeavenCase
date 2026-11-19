// Classes partagées des boutons, pour garder le même rendu sur les <button> et les <Link>.

const base =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

export const buttonPrimary = `${base} bg-gold-400 text-ink hover:bg-gold-300 active:bg-gold-500`

export const buttonOutline = `${base} border border-gold-500/70 text-gold-300 hover:bg-gold-500/10`

export const buttonGhost = `${base} text-muted hover:text-parchment hover:bg-white/5`
