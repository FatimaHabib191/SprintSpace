import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api'

/** Maps server-side validation errors onto form fields. Returns a general message if nothing mapped. */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, known: string[]): string | null {
  if (err instanceof ApiError && Object.keys(err.fields).length) {
    let mapped = false
    for (const [field, message] of Object.entries(err.fields)) {
      if (known.includes(field)) {
        setError(field as Path<T>, { type: 'server', message })
        mapped = true
      }
    }
    if (mapped) return null
  }
  return err instanceof Error ? err.message : 'Something went wrong'
}
