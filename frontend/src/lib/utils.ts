import { clsx, type ClassValue } from 'clsx'
import { format, parseISO } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Local calendar day as YYYY-MM-DD (matches the format the API stores and returns). */
export function todayStr(now = new Date()): string {
  return format(now, 'yyyy-MM-dd')
}

export function formatDay(day: string | null | undefined, pattern = 'MMM d, yyyy'): string {
  if (!day) return ''
  return format(parseISO(day), pattern)
}

export function isOverdue(dueDate: string | null | undefined, status: string, today = todayStr()): boolean {
  return !!dueDate && status !== 'done' && dueDate < today
}

export function daysUntil(day: string, today = todayStr()): number {
  const ms = parseISO(day).getTime() - parseISO(today).getTime()
  return Math.round(ms / 86_400_000)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}
