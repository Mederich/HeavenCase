import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { AuthLayout } from '@/components/AuthLayout'
import { Field } from '@/components/Field'
import { SuccessAlert } from '@/components/SuccessAlert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TermsDialog } from '@/components/terms/TermsDialog'
import { ApiError, toastError } from '@/lib/api'
import { birthDateError, todayIso } from '@/lib/age'

type Mode = 'login' | 'register'

const MIN_PASSWORD = 8

const routes: Record<Mode, string> = { register: '/register', login: '/login' }

function AuthTabs({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  return (
    <Tabs value={mode} onValueChange={(value) => navigate(routes[value as Mode])} className="mb-6">
      <TabsList className="h-10 w-full">
        <TabsTrigger value="register" className="data-active:text-gold-300">
          Inscription
        </TabsTrigger>
        <TabsTrigger value="login" className="data-active:text-gold-300">
          Connexion
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    try {
      await login(email.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      toastError(err, 'Connexion impossible.')
    } finally {
      setPending(false)
    }
  }

  return (
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
      <Field
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <div className="text-right">
        <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs text-muted-foreground hover:text-gold-300">
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </Button>
      </div>
      <Button type="submit" size="lg" className="h-10 w-full" disabled={pending || !email || !password}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link to="/register" className="font-medium text-gold-300 hover:underline">
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
  birthDate?: string
  terms?: string
}

function validate(
  username: string,
  email: string,
  password: string,
  birthDate: string,
  terms: boolean,
): RegisterErrors {
  const errors: RegisterErrors = {}
  if (!username.trim()) errors.username = 'Choisis un pseudo.'
  else if (username.trim().length > 32) errors.username = '32 caractères maximum.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Entre une adresse email valide.'
  if (password.length < MIN_PASSWORD) errors.password = `${MIN_PASSWORD} caractères minimum.`
  const birth = birthDateError(birthDate)
  if (birth) errors.birthDate = birth
  if (!terms) errors.terms = 'Accepte les conditions générales d’utilisation pour t’inscrire.'
  return errors
}

function RegisterForm() {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [done, setDone] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(username, email, password, birthDate, terms)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setPending(true)
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        birth_date: birthDate,
        accept_terms: terms,
      })
      setDone(email.trim())
    } catch (err) {
      // Refus pour l'âge : message sous le champ concerné.
      if (err instanceof ApiError && err.status === 403) setErrors({ birthDate: err.message })
      else toastError(err, 'Inscription impossible.')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <SuccessAlert>
          Compte créé. Lien de validation envoyé à <strong className="font-semibold">{done}</strong>.
        </SuccessAlert>
        <Button asChild size="lg" className="h-10 w-full">
          <Link to="/login">Aller à la connexion</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
      <Field
        label="Date de naissance"
        type="date"
        autoComplete="bday"
        max={todayIso()}
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        error={errors.birthDate}
        hint="18 ans minimum."
      />
      <div>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="terms"
            aria-label="J’accepte les conditions générales d’utilisation"
            checked={terms}
            onCheckedChange={(checked) => setTerms(checked === true)}
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={errors.terms ? 'terms-error' : undefined}
            className="mt-0.5"
          />
          <div className="text-sm leading-snug text-muted-foreground">
            <Label htmlFor="terms" className="inline font-normal text-muted-foreground">
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
          <p id="terms-error" className="mt-1.5 text-xs text-destructive">
            {errors.terms}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
        {pending ? 'Création du compte…' : 'Créer un compte'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link to="/login" className="font-medium text-gold-300 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  )
}

export function AuthPage({ mode }: { mode: Mode }) {
  const { user } = useAuth()
  const location = useLocation()
  // Une fois connecté, retour à la page qui a demandé la connexion (ex. une caisse).
  const from = (location.state as { from?: string } | null)?.from
  if (user) return <Navigate to={from ?? '/'} replace />

  return (
    <AuthLayout
      title={mode === 'register' ? 'Rejoignez la communauté' : 'Connexion'}
    >
      <AuthTabs mode={mode} />
      {mode === 'register' ? <RegisterForm /> : <LoginForm />}
    </AuthLayout>
  )
}
