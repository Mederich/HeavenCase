import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert } from '../components/Alert'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { api, toastError } from '../lib/api'
import { buttonPrimary } from '../lib/styles'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } })
      setSent(true)
    } catch (err) {
      toastError(err, 'Envoi impossible.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Indique l’email de ton compte, on t’envoie un lien pour choisir un nouveau mot de passe."
    >
      {sent ? (
        <div className="space-y-5">
          <Alert tone="success">
            Si un compte existe pour <strong className="font-semibold">{email.trim()}</strong>, un lien de
            réinitialisation vient d’y être envoyé.
          </Alert>
          <Link to="/connexion" className={`${buttonPrimary} w-full`}>
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="toi@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className={`${buttonPrimary} w-full`} disabled={pending || !email.trim()}>
            {pending ? 'Envoi…' : 'Envoyer le lien'}
          </button>
          <p className="text-center text-sm text-muted">
            <Link to="/connexion" className="font-medium text-gold-300 hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
