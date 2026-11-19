// Profil privé du joueur connecté (back/src/account.rs).
import { api } from './api'

export type AuthMethod = 'email' | 'steam'

export interface Account {
  id: string
  username: string
  email: string | null
  auth_methods: AuthMethod[]
  /** ISO 8601. */
  created_at: string
}

export const authMethodLabel: Record<AuthMethod, string> = {
  email: 'Email et mot de passe',
  steam: 'Steam',
}

export const USERNAME_MIN = 3
export const USERNAME_MAX = 32

export function getAccount() {
  return api<Account>('/account')
}

export function updateAccount(username: string) {
  return api<Account>('/account', { method: 'PATCH', body: { username } })
}

/** Mêmes règles que le serveur ; renvoie le message d'erreur ou undefined. */
export function usernameError(raw: string): string | undefined {
  const value = raw.trim()
  const length = [...value].length
  if (length === 0) return 'Le pseudo est obligatoire.'
  if (length < USERNAME_MIN || length > USERNAME_MAX)
    return `Entre ${USERNAME_MIN} et ${USERNAME_MAX} caractères.`
  if (!/^[\p{L}\p{N} _.-]+$/u.test(value)) return 'Lettres, chiffres, espaces, « _ », « - » et « . » uniquement.'
  if (value.includes('  ')) return 'Pas deux espaces à la suite.'
  return undefined
}
