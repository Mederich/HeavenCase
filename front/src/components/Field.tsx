import { useId, useState, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FieldProps extends Omit<ComponentProps<typeof Input>, 'id'> {
  label: string
  error?: string
  hint?: string
}

// Champ de formulaire : Label + Input shadcn, message d'erreur ou d'aide
// sous le champ, et bouton afficher/masquer pour les mots de passe.
export function Field({ label, error, hint, type = 'text', className, ...input }: FieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-2">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={isPassword ? 'h-10 pr-20' : 'h-10'}
          {...input}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRevealed((r) => !r)}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
            aria-label={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={revealed}
          >
            {revealed ? 'Masquer' : 'Afficher'}
          </Button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
