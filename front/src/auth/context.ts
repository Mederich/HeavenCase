import { createContext } from 'react'

/** Contrôles d'activation du compte (âge et CGU). */
export interface Eligibility {
  /** Date de naissance déclarée, AAAA-MM-JJ. */
  birth_date: string | null
  /** 18 ans ou plus déclarés. */
  age_verified: boolean
  /** Version courante des CGU acceptée. */
  terms_accepted: boolean
  terms_version: string
}

export interface CurrentUser {
  id: string
  username: string
  email: string | null
  /** Solde en crédits. */
  balance: number
  eligibility: Eligibility | null
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  /** AAAA-MM-JJ */
  birth_date: string
  accept_terms: boolean
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
