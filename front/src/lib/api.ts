// Client HTTP de l'API Heaven Case.
//
// Toutes les requêtes passent par /api (proxy Vite en dev) et envoient le
// cookie de session. L'API renvoie ses erreurs soit en texte brut (routes
// /auth), soit en JSON { "error": "..." } : les deux sont gérés ici.

import { toast } from 'sonner'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null
  const text = await res.text()
  if (!text) return null
  if (res.headers.get('content-type')?.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

function bodyMessage(body: unknown, status: number): string {
  if (typeof body === 'string' && body.trim()) return body
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  if (status >= 500) return 'Le serveur rencontre un problème, réessaie dans un instant.'
  return 'La requête a échoué.'
}

export async function api<T>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = options
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifie ta connexion.')
  }

  const payload = await readBody(res)
  if (!res.ok) throw new ApiError(res.status, bodyMessage(payload, res.status))
  return payload as T
}

/** Message à afficher pour une erreur levée par `api()`, ou `fallback` sinon. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

/**
 * Affiche une erreur dans le toaster. Réservé aux erreurs hors formulaire
 * (API, réseau) : les erreurs de champ restent affichées sous le champ.
 * L'id évite d'empiler deux fois le même message.
 */
export function toastError(err: unknown, fallback: string): void {
  const message = errorMessage(err, fallback)
  toast.error(message, { id: message })
}
