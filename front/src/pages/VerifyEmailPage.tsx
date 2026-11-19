import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '../components/Alert'
import { AuthLayout } from '../components/AuthLayout'
import { api, ApiError } from '../lib/api'
import { buttonPrimary } from '../lib/styles'

type State = { status: 'pending' } | { status: 'ok' } | { status: 'error'; message: string }

// Page ouverte depuis le lien reçu par mail : {APP_URL}/auth/verify?token=…
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<State>(
    token ? { status: 'pending' } : { status: 'error', message: 'Lien de validation incomplet.' },
  )
  // Le jeton est à usage unique : on évite le double appel du StrictMode en dev.
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    api(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then(() => setState({ status: 'ok' }))
      .catch((err) =>
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Validation impossible.',
        }),
      )
  }, [token])

  return (
    <AuthLayout title="Validation du compte">
      {state.status === 'pending' && <p className="text-sm text-muted">Validation de ton adresse email…</p>}
      {state.status === 'ok' && (
        <div className="space-y-5">
          <Alert tone="success">Ton adresse email est validée. Tu peux maintenant te connecter.</Alert>
          <Link to="/connexion" className={`${buttonPrimary} w-full`}>
            Se connecter
          </Link>
        </div>
      )}
      {state.status === 'error' && (
        <div className="space-y-5">
          <Alert tone="error">{state.message}</Alert>
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
