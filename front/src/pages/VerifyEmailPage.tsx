import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { SuccessAlert } from '@/components/SuccessAlert'
import { AuthLayout } from '@/components/AuthLayout'
import { api, toastError } from '@/lib/api'
import { Button } from '@/components/ui/button'

type Status = 'pending' | 'ok' | 'error'

const MISSING_TOKEN = 'Lien de validation incomplet.'

// Page ouverte depuis le lien reçu par mail : {APP_URL}/auth/verify?token=…
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<Status>(token ? 'pending' : 'error')
  // Le jeton est à usage unique : on évite le double appel du StrictMode en dev.
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    if (!token) {
      toastError(null, MISSING_TOKEN)
      return
    }
    api(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('ok'))
      .catch((err) => {
        setStatus('error')
        toastError(err, 'Validation impossible.')
      })
  }, [token])

  return (
    <AuthLayout title="Validation du compte">
      {status === 'pending' && <p className="text-sm text-muted-foreground">Validation de ton adresse email…</p>}
      {status === 'ok' && (
        <div className="space-y-5">
          <SuccessAlert>Ton adresse email est validée. Tu peux maintenant te connecter.</SuccessAlert>
          <Button asChild size="lg" className="h-10 w-full">
            <Link to="/login">Se connecter</Link>
          </Button>
        </div>
      )}
      {status === 'error' && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">Lien expiré ou déjà utilisé.</p>
          <Button asChild size="lg" className="h-10 w-full">
            <Link to="/login">Aller à la connexion</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
