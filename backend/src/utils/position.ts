export const GAP = 1024
export const MIN_GAP = 1e-6

export interface Placement {
  /** Position to store for the moved task. */
  position: number
  /** True when neighbours are too close together for another float midpoint; renumber the column. */
  needsRenumber: boolean
  /** The clamped index the task ends up at. */
  at: number
}

/** Computes where a task lands in a column.
 *  @param siblings positions of the other tasks in the destination column, ascending (moved task excluded)
 *  @param index    requested 0-based index in that column; clamped to [0, siblings.length] */
export function placeInColumn(siblings: number[], index: number): Placement {
  const at = Math.max(0, Math.min(index, siblings.length))
  const prev = siblings[at - 1]
  const next = siblings[at]

  if (prev !== undefined && next !== undefined) {
    return { position: (prev + next) / 2, needsRenumber: next - prev < MIN_GAP * 2, at }
  }
  if (prev !== undefined) return { position: prev + GAP, needsRenumber: false, at }
  if (next !== undefined) return { position: next - GAP, needsRenumber: false, at }
  return { position: GAP, needsRenumber: false, at }
}
