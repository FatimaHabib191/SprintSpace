import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { authApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/misc'
import { useAuth } from '@/context/AuthContext'
import { applyServerErrors } from '@/lib/formErrors'
import { passwordSchema, profileSchema } from '@/lib/schemas'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-ink-muted">{description}</p>
      {children}
    </section>
  )
}

function ProfileForm() {
  const { user, setUser } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty }, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  })
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      const updated = await authApi.updateProfile(v)
      setUser(updated)
      reset({ name: updated.name })
      toast.success('Profile updated')
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['name']))
    }
  })
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Name" htmlFor="s-name" error={errors.name?.message}>
        <Input id="s-name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
      </Field>
      <Field label="Email" htmlFor="s-email" hint="Your email is your sign-in and can’t be changed here.">
        <Input id="s-email" value={user?.email ?? ''} readOnly disabled />
      </Field>
      {formError && <p role="alert" className="rounded-lg bg-terracotta-50 px-3 py-2 text-sm text-terracotta-700">{formError}</p>}
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save profile</Button>
    </form>
  )
}

function PasswordForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword })
      reset({ currentPassword: '', newPassword: '', confirm: '' })
      toast.success('Password changed')
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['currentPassword', 'newPassword']))
    }
  })
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Current password" htmlFor="pw-cur" error={errors.currentPassword?.message}>
        <Input id="pw-cur" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register('currentPassword')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="pw-new" error={errors.newPassword?.message} hint="At least 8 characters, with a letter and a number.">
          <Input id="pw-new" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register('newPassword')} />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirm?.message}>
          <Input id="pw-confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register('confirm')} />
        </Field>
      </div>
      {formError && <p role="alert" className="rounded-lg bg-terracotta-50 px-3 py-2 text-sm text-terracotta-700">{formError}</p>}
      <Button type="submit" loading={isSubmitting}>Update password</Button>
    </form>
  )
}

export function Settings() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader title="Settings" subtitle={user ? `Member since ${format(parseISO(user.createdAt), 'MMMM yyyy')}` : undefined} />
      <div className="max-w-2xl space-y-6">
        <Card title="Profile" description="How your name appears in your workspace."><ProfileForm /></Card>
        <Card title="Password" description="Choose a strong password you don’t use elsewhere."><PasswordForm /></Card>
      </div>
    </>
  )
}
