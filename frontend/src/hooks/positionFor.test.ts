import { describe, expect, it } from 'vitest'
import type { Task } from '@/lib/types'
import { positionFor } from './queries'

const t = (position: number): Task => ({ position }) as Task

describe('positionFor (optimistic ordering mirrors the server)', () => {
  const col = [t(1024), t(2048), t(3072)]
  it('handles empty, start, middle and end', () => {
    expect(positionFor([], 0)).toBe(1024)
    expect(positionFor(col, 0)).toBeLessThan(1024)
    expect(positionFor(col, 1)).toBe(1536)
    expect(positionFor(col, 3)).toBe(4096)
    expect(positionFor(col, 99)).toBe(4096)
  })
})
