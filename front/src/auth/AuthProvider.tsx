import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '../lib/api'
import { AuthContext, type AuthContextValue, type CurrentUser, type RegisterInput } from './context'

async function fetchMe(): Promise<CurrentUser | null> {
  try {
    return await api<CurrentUser>('/auth/me')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined)

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchMe())
    } catch {
      // API injoignable : on affiche le site en mode déconnecté.
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    await api('/auth/login', { method: 'POST', body: { email, password } })
    setUser(await fetchMe())
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api<{ id: string; message: string }>('/auth/register', {
      method: 'POST',
      body: input,
    })
    return res.message
  }, [])

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, login, register, logout, refresh }),
    [user, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
