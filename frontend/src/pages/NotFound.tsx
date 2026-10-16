import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/misc'

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <Logo />
      <h1 className="font-serif text-4xl font-semibold text-forest-800">Page not found</h1>
      <p className="max-w-sm text-sm text-ink-muted">The page you’re looking for doesn’t exist or has moved.</p>
      <Button asChild><Link to="/">Go home</Link></Button>
    </div>
  )
}
