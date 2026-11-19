import { useState, type FormEvent } from 'react'
import { Link, Navigate, NavLink, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { ApiError } from '../lib/api'
import { buttonPrimary } from '../lib/styles'

type Mode = 'login' | 'register'

const MIN_PASSWORD = 8

function AuthTabs() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    'flex-1 rounded-md py-2 text-center text-sm font-semibold transition-colors ' +
    (isActive ? 'bg-panel-raised text-gold-300 shadow-inner' : 'text-muted hover:text-parchment')

  return (
    <nav className="mb-6 flex gap-1 rounded-lg border border-line bg-ink/60 p-1" aria-label="Connexion ou inscription">
      <NavLink to="/inscription" className={tab}>
        Inscription
      </NavLink>
      <NavLink to="/connexion" className={tab}>
        Connexion
      </NavLink>
    </nav>
  )
}

function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(email.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="toi@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Field
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <div className="text-right">
        <Link to="/mot-de-passe-oublie" className="text-xs text-muted underline-offset-4 hover:text-gold-300 hover:underline">
          Mot de passe oublié ?
        </Link>
      </div>
      <button type="submit" className={`${buttonPrimary} w-full`} disabled={pending || !email || !password}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{' '}
        <Link to="/inscription" className="font-medium text-gold-300 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  )
}

interface RegisterErrors {
  username?: string
  email?: string
  password?: string
  terms?: string
}

function validate(username: string, email: string, password: string, terms: boolean): RegisterErrors {
  const errors: RegisterErrors = {}
  if (!username.trim()) errors.username = 'Choisis un pseudo.'
  else if (username.trim().length > 32) errors.username = '32 caractères maximum.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Entre une adresse email valide.'
  if (password.length < MIN_PASSWORD) errors.password = `${MIN_PASSWORD} caractères minimum.`
  if (!terms) errors.terms = 'Tu dois être majeur et accepter les conditions pour t’inscrire.'
  return errors
}

function RegisterForm() {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const found = validate(username, email, password, terms)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setPending(true)
    try {
      await register({ username: username.trim(), email: email.trim(), password })
      setDone(email.trim())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription impossible.')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <Alert tone="success">
          Compte créé ! Un lien de validation a été envoyé à <strong className="font-semibold">{done}</strong>. Clique
          dessus pour activer ton compte, puis connecte-toi.
        </Alert>
        <Link to="/connexion" className={`${buttonPrimary} w-full`}>
          Aller à la connexion
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field
        label="Pseudo"
        autoComplete="username"
        placeholder="TonPseudo"
        maxLength={32}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={errors.username}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="toi@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <Field
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint={`${MIN_PASSWORD} caractères minimum.`}
      />
      <div>
        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            aria-invalid={errors.terms ? true : undefined}
            className="mt-0.5 size-4 shrink-0 accent-gold-400"
          />
          <span>J’ai au moins 18 ans et j’accepte les conditions d’utilisation et la politique de confidentialité.</span>
        </label>
        {errors.terms && <p className="mt-1.5 text-xs text-danger">{errors.terms}</p>}
      </div>
      <button type="submit" className={`${buttonPrimary} w-full`} disabled={pending}>
        {pending ? 'Création du compte…' : 'Créer un compte'}
      </button>
      <p className="text-center text-sm text-muted">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="font-medium text-gold-300 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  )
}

export function AuthPage({ mode }: { mode: Mode }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />

  return (
    <AuthLayout
      title={mode === 'register' ? 'Rejoignez la communauté' : 'Bon retour parmi nous'}
      subtitle={
        mode === 'register'
          ? 'Crée ton compte pour ouvrir des caisses célestes et constituer ton inventaire.'
          : 'Connecte-toi pour retrouver ton solde et ton inventaire.'
      }
    >
      <AuthTabs />
      {mode === 'register' ? <RegisterForm /> : <LoginForm />}
    </AuthLayout>
  )
}
