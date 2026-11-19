import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '../components/Alert'
import { AuthLayout } from '../components/AuthLayout'
import { api, toastError } from '../lib/api'
import { buttonPrimary } from '../lib/styles'

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
      {status === 'pending' && <p className="text-sm text-muted">Validation de ton adresse email…</p>}
      {status === 'ok' && (
        <div className="space-y-5">
          <Alert tone="success">Ton adresse email est validée. Tu peux maintenant te connecter.</Alert>
          <Link to="/connexion" className={`${buttonPrimary} w-full`}>
            Se connecter
          </Link>
        </div>
      )}
      {status === 'error' && (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Le lien a peut-être expiré ou déjà servi. Si ton compte est déjà validé, connecte-toi directement.
          </p>
          <Link to="/connexion" className={`${buttonPrimary} w-full`}>
            Aller à la connexion
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}
