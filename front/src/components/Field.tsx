import { useId, useState, type InputHTMLAttributes } from 'react'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, type = 'text', className, ...input }: FieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-parchment">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={
            'w-full rounded-md border bg-ink/70 px-3 py-2.5 text-sm text-parchment placeholder:text-muted/70 ' +
            'outline-none transition-colors focus:border-gold-400 focus:ring-2 focus:ring-gold-400/25 ' +
            (error ? 'border-danger/80' : 'border-line') +
            (isPassword ? ' pr-20' : '')
          }
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted hover:text-gold-300"
            aria-label={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={revealed}
          >
            {revealed ? 'Masquer' : 'Afficher'}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
