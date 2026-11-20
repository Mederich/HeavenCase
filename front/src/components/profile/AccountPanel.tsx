import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { Field } from '@/components/Field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastError } from '@/lib/api'
import { authMethodLabel, getAccount, updateAccount, USERNAME_MAX, usernameError, type Account } from '@/lib/account'

const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

export function AccountPanel() {
  const { refresh } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let active = true
    getAccount()
      .then((a) => active && setAccount(a))
      .catch((err) => {
        if (!active) return
        setFailed(true)
        toastError(err, 'Impossible de charger le profil.')
      })
    return () => {
      active = false
    }
  }, [])

  if (failed) return <p className="text-sm text-muted-foreground">Profil indisponible.</p>
  if (!account) {
    return (
      <div className="max-w-xl space-y-3" aria-busy="true" aria-label="Chargement du profil">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    )
  }

  const onSaved = (updated: Account) => {
    setAccount(updated)
    setEditing(false)
    void refresh()
  }

  return (
    <section aria-labelledby="account-title" className="max-w-xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="account-title" className="text-lg font-semibold">
          Mon profil
        </h2>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Modifier mon profil
          </Button>
        )}
      </div>

      {editing ? (
        <EditForm account={account} onCancel={() => setEditing(false)} onSaved={onSaved} />
      ) : (
        <dl className="divide-y rounded-xl border bg-card">
          <Row label="Pseudo" value={account.username} />
          <Row label="Email" value={account.email ?? 'Aucun'} />
          <Row label="Connexion" value={account.auth_methods.map((m) => authMethodLabel[m]).join(', ') || '–'} />
          <Row label="Membre depuis" value={day.format(new Date(account.created_at))} />
        </dl>
      )}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium" title={value}>
        {value}
      </dd>
    </div>
  )
}

interface EditFormProps {
  account: Account
  onCancel: () => void
  onSaved: (account: Account) => void
}

function EditForm({ account, onCancel, onSaved }: EditFormProps) {
  const [username, setUsername] = useState(account.username)
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = usernameError(username)
    setError(found)
    if (found) return
    if (username.trim() === account.username) {
      onCancel()
      return
    }

    setPending(true)
    try {
      const updated = await updateAccount(username.trim())
      toast.success('Profil mis à jour.')
      onSaved(updated)
    } catch (err) {
      toastError(err, 'Enregistrement impossible, réessaie.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
      <Field
        label="Pseudo"
        autoComplete="username"
        maxLength={USERNAME_MAX}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={error}
        hint="3 à 32 caractères : lettres, chiffres, espaces, « _ », « - » et « . »."
        autoFocus
      />
      <Field
        label="Email"
        type="email"
        value={account.email ?? ''}
        readOnly
        disabled
        hint="Non modifiable ici. Le mot de passe se change avec « Mot de passe oublié »."
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
