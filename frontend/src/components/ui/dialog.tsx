import * as AlertPrimitive from '@radix-ui/react-alert-dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export const Dialog = DialogPrimitive.Root
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, children, title, description, side = false }: {
  className?: string; children: React.ReactNode; title: string; description?: string; side?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ss-overlay fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-[1px]" />
      <DialogPrimitive.Content
        className={cn(
          side
            ? 'ss-sheet fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-paper shadow-lift'
            : 'ss-dialog fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-paper p-6 shadow-lift',
          className,
        )}
      >
        <div className={cn('flex items-start justify-between gap-4', side && 'border-b border-line px-6 py-4')}>
          <div>
            <DialogPrimitive.Title className="font-serif text-xl font-semibold text-charcoal">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className={cn('mt-1 text-sm text-ink-muted', !description && 'sr-only')}>
              {description ?? title}
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close className="-m-1 rounded-md p-1 text-ink-muted hover:bg-sage-100 hover:text-charcoal" aria-label="Close">
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </div>
        <div className={cn(side ? 'flex-1 px-6 py-5' : 'mt-5')}>{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

interface ConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  loading?: boolean
  onConfirm: () => void
}

/** Confirmation for destructive actions. Stays open while the request runs to prevent double submits. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, loading, onConfirm }: ConfirmProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="ss-overlay fixed inset-0 z-[60] bg-charcoal/40" />
        <AlertPrimitive.Content className="ss-dialog fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-paper p-6 shadow-lift">
          <AlertPrimitive.Title className="font-serif text-lg font-semibold">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</AlertPrimitive.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertPrimitive.Cancel asChild>
              <Button variant="outline" disabled={loading}>Cancel</Button>
            </AlertPrimitive.Cancel>
            <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  )
}
