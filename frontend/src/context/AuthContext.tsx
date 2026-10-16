import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/api/endpoints'
import { ApiError, setUnauthorizedHandler } from '@/lib/api'
import type { User } from '@/lib/types'

interface AuthState {
  user: User | null
  loading: boolean
  /** True when the session ended while the user was working (expired or revoked). */
  sessionExpired: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setUser: (u: User) => void
  clearExpired: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Restore the session from the HttpOnly cookie on first load.
  useEffect(() => {
    let alive = true
    authApi
      .me()
      .then((u) => alive && setUserState(u))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  // Any later 401 means the session died: drop cached data and send the user to sign in.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUserState((current) => {
        if (current) setSessionExpired(true)
        return null
      })
      qc.clear()
    })
    return () => setUnauthorizedHandler(null)
  }, [qc])

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await authApi.login({ email, password })
    qc.clear()
    setSessionExpired(false)
    setUserState(u)
  }, [qc])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const u = await authApi.register({ name, email, password })
    qc.clear()
    setSessionExpired(false)
    setUserState(u)
  }, [qc])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      qc.clear()
      setUserState(null)
    }
  }, [qc])

  const value = useMemo<AuthState>(
    () => ({ user, loading, sessionExpired, signIn, signUp, signOut, setUser: setUserState, clearExpired: () => setSessionExpired(false) }),
    [user, loading, sessionExpired, signIn, signUp, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
