import { describe, expect, it } from 'vitest'
import { passwordSchema, projectSchema, signUpSchema, taskSchema } from './schemas'

describe('form schemas', () => {
  it('requires strong passwords on sign up', () => {
    expect(signUpSchema.safeParse({ name: 'A', email: 'a@b.co', password: 'short1' }).success).toBe(false)
    expect(signUpSchema.safeParse({ name: 'A', email: 'a@b.co', password: 'longpasswordonly' }).success).toBe(false)
    expect(signUpSchema.safeParse({ name: 'A', email: 'a@b.co', password: 'Passw0rdOK' }).success).toBe(true)
    expect(signUpSchema.safeParse({ name: 'A', email: 'not-an-email', password: 'Passw0rdOK' }).success).toBe(false)
  })

  it('rejects a deadline before the start date', () => {
    const base = { name: 'P', description: '', color: '#2f5d46' }
    const bad = projectSchema.safeParse({ ...base, startDate: '2026-05-01', deadline: '2026-04-01' })
    expect(bad.success).toBe(false)
    if (!bad.success) expect(bad.error.issues[0]?.path).toEqual(['deadline'])
    expect(projectSchema.safeParse({ ...base, startDate: '2026-05-01', deadline: '2026-05-01' }).success).toBe(true)
    expect(projectSchema.safeParse({ ...base, startDate: '', deadline: '2026-05-01' }).success).toBe(true)
  })

  it('requires a title and a project for tasks', () => {
    const ok = { title: 'T', description: '', project: 'abc', status: 'todo', priority: 'medium', dueDate: '' }
    expect(taskSchema.safeParse(ok).success).toBe(true)
    expect(taskSchema.safeParse({ ...ok, title: '   ' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...ok, project: '' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...ok, priority: 'asap' }).success).toBe(false)
  })

  it('checks that the new passwords match', () => {
    expect(passwordSchema.safeParse({ currentPassword: 'x', newPassword: 'Passw0rdOK', confirm: 'different1' }).success).toBe(false)
    expect(passwordSchema.safeParse({ currentPassword: 'x', newPassword: 'Passw0rdOK', confirm: 'Passw0rdOK' }).success).toBe(true)
  })
})
