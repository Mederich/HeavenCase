import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { Field } from '@/components/Field'
import { TermsDialog } from '@/components/terms/TermsDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { api, ApiError, toastError } from '@/lib/api'
import { birthDateError, todayIso } from '@/lib/age'

/**
 * Bloque l'accès tant que le compte n'a pas déclaré son âge ou accepté la
 * version courante des CGU (comptes créés avant ces contrôles, nouvelle
 * version des CGU). Le serveur refuse de toute façon les actions sensibles.
 */
export function AccountGate() {
  const { user } = useAuth()
  const eligibility = user?.eligibility
  if (!user || !eligibility || (eligibility.age_verified && eligibility.terms_accepted)) return null
  return <GateDialog key={user.id} />
}

function GateDialog() {
  const { user, refresh, logout } = useAuth()
  const eligibility = user!.eligibility!
  const underage = eligibility.birth_date !== null && !eligibility.age_verified
  const needsBirthDate = eligibility.birth_date === null
  const termsChanged = eligibility.age_verified && !eligibility.terms_accepted

  const [birthDate, setBirthDate] = useState('')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<{ birthDate?: string; terms?: string }>({})
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: typeof errors = {}
    if (needsBirthDate) found.birthDate = birthDateError(birthDate)
    if (!eligibility.terms_accepted && !terms) found.terms = 'Accepte les conditions générales d’utilisation pour continuer.'
    setErrors(found)
    if (found.birthDate || found.terms) return

    setPending(true)
    try {
      await api('/auth/complete', {
        method: 'POST',
        body: { birth_date: needsBirthDate ? birthDate : null, accept_terms: terms },
      })
      await refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) await refresh()
      else toastError(err, 'Enregistrement impossible, réessaie.')
    } finally {
      setPending(false)
    }
  }

  const onLogout = () => {
    logout().catch((err) => toastError(err, 'Déconnexion impossible.'))
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        {underage ? (
          <>
            <DialogHeader>
              <DialogTitle>Compte non activé</DialogTitle>
              <DialogDescription>
                HeavenCases est réservé aux personnes majeures. La date de naissance déclarée pour ce compte indique moins de
                18 ans.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onLogout}>
                Se déconnecter
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <DialogHeader>
              <DialogTitle>{termsChanged ? 'Nouvelles conditions d’utilisation' : 'Activer ton compte'}</DialogTitle>
              <DialogDescription>
                {termsChanged
                  ? 'Les conditions générales d’utilisation ont changé. Accepte la nouvelle version pour continuer.'
                  : 'Renseigne ta date de naissance et accepte les conditions générales d’utilisation pour utiliser ton compte.'}
              </DialogDescription>
            </DialogHeader>

            {needsBirthDate && (
              <Field
                label="Date de naissance"
                type="date"
                autoComplete="bday"
                max={todayIso()}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                error={errors.birthDate}
                hint="18 ans minimum. Elle ne pourra plus être modifiée."
              />
            )}

            {!eligibility.terms_accepted && (
              <div>
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="gate-terms"
            aria-label="J’accepte les conditions générales d’utilisation"
                    checked={terms}
                    onCheckedChange={(checked) => setTerms(checked === true)}
                    aria-invalid={errors.terms ? true : undefined}
                    aria-describedby={errors.terms ? 'gate-terms-error' : undefined}
                    className="mt-0.5"
                  />
                  <div className="text-sm leading-snug text-muted-foreground">
                    <Label htmlFor="gate-terms" className="inline font-normal text-muted-foreground">
                      J’accepte les{' '}
                    </Label>
                    <TermsDialog
                      onAccept={() => setTerms(true)}
                      trigger={
                        <button type="button" className="font-medium text-gold-300 underline-offset-4 hover:underline">
                          conditions générales d’utilisation
                        </button>
                      }
                    />
                  </div>
                </div>
                {errors.terms && (
                  <p id="gate-terms-error" className="mt-1.5 text-xs text-destructive">
                    {errors.terms}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onLogout}>
                Se déconnecter
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Enregistrement…' : 'Continuer'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
