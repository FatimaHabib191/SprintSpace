import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/misc'
import { useAuth } from '@/context/AuthContext'
import { applyServerErrors } from '@/lib/formErrors'
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from '@/lib/schemas'

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" className="w-fit"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-serif text-3xl font-semibold text-forest-800">{title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-sm text-ink-muted">{footer}</p>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-forest-700 p-12 text-ivory lg:flex lg:flex-col lg:justify-end" aria-hidden>
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-forest-600/60" />
        <div className="absolute -bottom-16 left-10 h-64 w-64 rounded-full bg-terracotta-500/25" />
        <blockquote className="relative max-w-md font-serif text-3xl leading-snug">“A clear board turns a heavy week into a handful of next steps.”</blockquote>
        <p className="relative mt-4 text-sm text-forest-100">Plan it. Move it. Finish it.</p>
      </aside>
    </div>
  )
}

export function SignIn() {
  const { signIn, sessionExpired, clearExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) })

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      await signIn(v.email, v.password)
      clearExpired()
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['email', 'password']))
    }
  })

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to pick up where you left off." footer={<>New to SprintSpace? <Link className="font-medium text-forest-600 underline" to="/signup">Create an account</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {sessionExpired && <p role="status" className="rounded-lg bg-ochre-50 px-3 py-2 text-sm text-ochre-600">Your session expired. Please sign in again.</p>}
        <Field label="Email" htmlFor="si-email" error={errors.email?.message}>
          <Input id="si-email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="si-pw" error={errors.password?.message}>
          <Input id="si-pw" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
        </Field>
        {formError && <p role="alert" className="rounded-lg bg-terracotta-50 px-3 py-2 text-sm text-terracotta-700">{formError}</p>}
        <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
      </form>
    </AuthLayout>
  )
}

export function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) })

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      await signUp(v.name, v.email, v.password)
      toast.success('Welcome to SprintSpace!')
      navigate('/app', { replace: true })
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['name', 'email', 'password']))
    }
  })

  return (
    <AuthLayout title="Create your account" subtitle="Free to start. Your workspace is ready in seconds." footer={<>Already have an account? <Link className="font-medium text-forest-600 underline" to="/signin">Sign in</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Name" htmlFor="su-name" error={errors.name?.message}>
          <Input id="su-name" autoComplete="name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="su-email" error={errors.email?.message}>
          <Input id="su-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="su-pw" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
          <Input id="su-pw" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
        </Field>
        {formError && <p role="alert" className="rounded-lg bg-terracotta-50 px-3 py-2 text-sm text-terracotta-700">{formError}</p>}
        <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </AuthLayout>
  )
}
