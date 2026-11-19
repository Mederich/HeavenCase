// Toaster shadcn/ui (Sonner), adapté au thème noir et or. Le site n'a qu'un
// thème sombre : pas besoin de next-themes, le thème est fixé à "dark".
import type { CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      richColors
      closeButton
      duration={6000}
      visibleToasts={4}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--color-panel-raised)',
          '--normal-text': 'var(--color-parchment)',
          '--normal-border': 'var(--color-line)',
          '--error-bg': 'color-mix(in oklab, var(--color-danger) 12%, var(--color-panel-raised))',
          '--error-border': 'color-mix(in oklab, var(--color-danger) 45%, transparent)',
          '--error-text': 'var(--color-danger)',
          '--border-radius': '0.5rem',
          fontFamily: 'var(--font-sans)',
        } as CSSProperties
      }
      {...props}
    />
  )
}
