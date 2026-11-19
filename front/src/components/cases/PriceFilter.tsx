import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parsePriceRange, type PriceFilterErrors } from '@/lib/cases'

interface PriceFilterProps {
  initialMin: string
  initialMax: string
  /** Erreurs des valeurs lues dans l'URL. */
  initialErrors?: PriceFilterErrors
  active: boolean
  onApply: (min: string, max: string) => void
  onReset: () => void
}

export function PriceFilter({ initialMin, initialMax, initialErrors, active, onApply, onReset }: PriceFilterProps) {
  const [min, setMin] = useState(initialMin)
  const [max, setMax] = useState(initialMax)
  const [errors, setErrors] = useState<PriceFilterErrors>(initialErrors ?? {})

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = parsePriceRange(min, max)
    if ('errors' in result) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    onApply(min.trim(), max.trim())
  }

  function reset() {
    setMin('')
    setMax('')
    setErrors({})
    onReset()
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Filtrer par prix" className="flex flex-wrap items-start gap-3">
      <PriceField id="price-min" label="Prix min" value={min} onChange={setMin} error={errors.min} />
      <PriceField id="price-max" label="Prix max" value={max} onChange={setMax} error={errors.max} />
      <div className="flex gap-2 pt-6">
        <Button type="submit">Filtrer</Button>
        {(active || min || max) && (
          <Button type="button" variant="outline" onClick={reset}>
            Réinitialiser
          </Button>
        )}
      </div>
    </form>
  )
}

interface PriceFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

function PriceField({ id, label, value, onChange, error }: PriceFieldProps) {
  return (
    <div className="w-36">
      <Label htmlFor={id} className="mb-1.5 text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="crédits"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
