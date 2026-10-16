import { z } from 'zod'

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').or(z.literal(''))

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep it under 80 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Za-z]/, 'Include a letter')
    .regex(/\d/, 'Include a number'),
})

export const profileSchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(80) })

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: signUpSchema.shape.password,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, 'Project name is required').max(100, 'Keep it under 100 characters'),
    description: z.string().trim().max(2000, 'Keep it under 2000 characters'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    startDate: day,
    deadline: day,
  })
  .refine((v) => !v.startDate || !v.deadline || v.deadline >= v.startDate, {
    path: ['deadline'],
    message: 'Deadline cannot be before the start date',
  })

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Keep it under 200 characters'),
  description: z.string().trim().max(5000, 'Keep it under 5000 characters'),
  project: z.string().min(1, 'Choose a project'),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: day,
})

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ProjectValues = z.infer<typeof projectSchema>
export type TaskValues = z.infer<typeof taskSchema>

export const PROJECT_COLORS = ['#2f5d46', '#6b8f71', '#c4704f', '#8a6f3d', '#4f6d7a', '#7b5e7b', '#3d4a45', '#b08968']
