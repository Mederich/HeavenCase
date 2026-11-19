import { createContext } from 'react'

export interface CurrentUser {
  id: string
  username: string
  email: string | null
  /** Solde en crédits. */
  balance: number
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export interface AuthContextValue {
  /** null : pas connecté. undefined : vérification de la session en cours. */
  user: CurrentUser | null | undefined
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<string>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  /** Met à jour le solde affiché avec celui renvoyé par l'API (achat, vente). */
  setBalance: (balance: number) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
