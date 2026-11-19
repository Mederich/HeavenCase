import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Alert } from '../components/Alert'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { api, toastError } from '../lib/api'
import { buttonPrimary } from '../lib/styles'

const MIN_PASSWORD = 8
const MISSING_TOKEN = 'Lien de réinitialisation incomplet.'

// Page ouverte depuis le lien reçu par mail : {APP_URL}/reset-password?token=…
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({})
  const [failed, setFailed] = useState(false)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!token) toast.error(MISSING_TOKEN, { id: MISSING_TOKEN })
  }, [token])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: typeof fieldErrors = {}
    if (password.length < MIN_PASSWORD) found.password = `${MIN_PASSWORD} caractères minimum.`
    if (confirm !== password) found.confirm = 'Les deux mots de passe ne correspondent pas.'
    setFieldErrors(found)
    if (Object.keys(found).length > 0 || !token) return

    setPending(true)
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, new_password: password } })
      setDone(true)
    } catch (err) {
      setFailed(true)
      toastError(err, 'Réinitialisation impossible.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisis le nouveau mot de passe de ton compte.">
      {!token ? (
        <div className="space-y-5">
          <p className="text-sm text-muted">Ouvre le lien reçu par mail en entier, ou demandes-en un nouveau.</p>
          <Link to="/mot-de-passe-oublie" className={`${buttonPrimary} w-full`}>
            Demander un nouveau lien
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-5">
          <Alert tone="success">Ton mot de passe a été modifié.</Alert>
          <Link to="/connexion" className={`${buttonPrimary} w-full`}>
            Se connecter
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            hint={`${MIN_PASSWORD} caractères minimum.`}
          />
          <Field
            label="Confirmation"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={fieldErrors.confirm}
          />
          <button type="submit" className={`${buttonPrimary} w-full`} disabled={pending}>
            {pending ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
          {failed && (
            <p className="text-center text-sm text-muted">
              Lien expiré ?{' '}
              <Link to="/mot-de-passe-oublie" className="font-medium text-gold-300 hover:underline">
                Demander un nouveau lien
              </Link>
            </p>
          )}
        </form>
      )}
    </AuthLayout>
  )
}
