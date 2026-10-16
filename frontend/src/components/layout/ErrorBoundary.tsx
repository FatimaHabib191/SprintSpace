import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 px-5 text-center">
        <h1 className="font-serif text-3xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-ink-muted">An unexpected error occurred. Reloading usually fixes it.</p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    )
  }
}
