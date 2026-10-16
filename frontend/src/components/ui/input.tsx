import * as React from 'react'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-lg border border-line-strong bg-paper px-3 text-sm text-charcoal placeholder:text-ink-muted/70 transition-colors focus-visible:border-forest-600 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-forest-600/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-terracotta-500'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(field, 'h-10', className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(field, 'min-h-24 py-2 leading-relaxed', className)} {...props} />
))
Textarea.displayName = 'Textarea'

/** Native select styled to match; the most reliable choice for mobile and keyboard users. */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(field, 'h-10 cursor-pointer appearance-none bg-no-repeat pr-9', className)}
    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236b706a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: 'right 0.65rem center' }}
    {...props}>
    {children}
  </select>
))
NativeSelect.displayName = 'NativeSelect'

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-charcoal">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-terracotta-600">{error}</p>}
    </div>
  )
}
