import { describe, expect, it } from 'vitest'
import { daysUntil, initials, isOverdue, plural, todayStr } from './utils'

describe('utils', () => {
  it('formats a local calendar day', () => {
    expect(todayStr(new Date(2026, 5, 1, 23, 59))).toBe('2026-06-01')
  })

  it('flags overdue only for unfinished tasks with a past due date', () => {
    expect(isOverdue('2026-05-31', 'todo', '2026-06-01')).toBe(true)
    expect(isOverdue('2026-05-31', 'in_progress', '2026-06-01')).toBe(true)
    expect(isOverdue('2026-05-31', 'done', '2026-06-01')).toBe(false)
    expect(isOverdue('2026-06-01', 'todo', '2026-06-01')).toBe(false)
    expect(isOverdue(null, 'todo', '2026-06-01')).toBe(false)
  })

  it('counts days until a date', () => {
    expect(daysUntil('2026-06-08', '2026-06-01')).toBe(7)
    expect(daysUntil('2026-05-30', '2026-06-01')).toBe(-2)
  })

  it('builds initials and plurals', () => {
    expect(initials('ada lovelace byron')).toBe('AL')
    expect(plural(1, 'task')).toBe('1 task')
    expect(plural(0, 'task')).toBe('0 tasks')
  })
})
