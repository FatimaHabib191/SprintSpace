import axios, { AxiosError } from 'axios'

export const api = axios.create({
  // '/api' works in dev (Vite proxy) and in production behind a Vercel rewrite.
  // Set VITE_API_URL (e.g. https://sprintspace-api.onrender.com/api) to call the API directly.
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  headers: { 'X-Requested-With': 'sprintspace' },
  timeout: 20_000,
})

export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string>
  constructor(message: string, status: number, code: string, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null
export const setUnauthorizedHandler = (fn: UnauthorizedHandler | null) => {
  onUnauthorized = fn
}

// Failed sign-in/registration attempts are ordinary form errors, not an expired session.
const NO_REDIRECT_PATHS = ['/auth/login', '/auth/register']

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: { message?: string; code?: string; details?: Record<string, string> } }>) => {
    if (!err.response) {
      const offline = err.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : "Can't reach the server. Check your connection and try again."
      return Promise.reject(new ApiError(offline, 0, 'NETWORK'))
    }
    const { status, data } = err.response
    const url = err.config?.url ?? ''
    // An expired/invalid session on a normal request sends the user back to sign in.
    if (status === 401 && !NO_REDIRECT_PATHS.some((p) => url.startsWith(p))) {
      onUnauthorized?.()
    }
    const e = data?.error
    const fields = e?.details && typeof e.details === 'object' ? e.details : {}
    return Promise.reject(new ApiError(e?.message ?? 'Something went wrong', status, e?.code ?? 'ERROR', fields))
  },
)

export const errorMessage = (err: unknown, fallback = 'Something went wrong') =>
  err instanceof Error && err.message ? err.message : fallback
