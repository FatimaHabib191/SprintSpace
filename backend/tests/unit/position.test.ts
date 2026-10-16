import { GAP, placeInColumn } from '../../src/utils/position';

/** Simulates the server: insert at `index`, persist the computed position, renumber if crowded. */
function insert(column: number[], index: number) {
  const p = placeInColumn(column, index);
  if (p.needsRenumber) {
    const next = column.map((_, i) => (i + 1) * GAP);
    next.splice(p.at, 0, (p.at + 1) * GAP);
    return next.map((_, i) => (i + 1) * GAP);
  }
  return [...column, p.position].sort((a, b) => a - b);
}

describe('placeInColumn', () => {
  it('places into an empty column', () => {
    expect(placeInColumn([], 0)).toMatchObject({ position: GAP, at: 0, needsRenumber: false });
  });

  it('places at the start, middle and end', () => {
    const col = [1024, 2048, 3072];
    expect(placeInColumn(col, 0).position).toBeLessThan(1024);
    expect(placeInColumn(col, 1).position).toBe(1536);
    expect(placeInColumn(col, 3).position).toBe(3072 + GAP);
  });

  it('clamps out-of-range indexes', () => {
    const col = [1024, 2048];
    expect(placeInColumn(col, 99).at).toBe(2);
    expect(placeInColumn(col, -5).at).toBe(0);
  });

  it('always yields a strictly ordered result between neighbours', () => {
    const col = [1024, 2048, 3072, 4096];
    for (let i = 0; i <= col.length; i++) {
      const { position, at } = placeInColumn(col, i);
      const merged = [...col.slice(0, at), position, ...col.slice(at)];
      expect([...merged].sort((a, b) => a - b)).toEqual(merged);
      expect(new Set(merged).size).toBe(merged.length);
    }
  });

  it('flags a renumber once the float gap is exhausted, long before precision is lost', () => {
    let col = [1024, 2048];
    let renumbered = false;
    for (let i = 0; i < 200 && !renumbered; i++) {
      const p = placeInColumn(col, 1);
      if (p.needsRenumber) renumbered = true;
      else col = [...col, p.position].sort((a, b) => a - b);
    }
    expect(renumbered).toBe(true);
    expect(new Set(col).size).toBe(col.length);
  });

  it('keeps a stable order through many repeated inserts at the same index', () => {
    let col: number[] = [GAP];
    for (let i = 0; i < 500; i++) col = insert(col, 1);
    expect(col).toHaveLength(501);
    expect(new Set(col).size).toBe(501);
    expect([...col].sort((a, b) => a - b)).toEqual(col);
  });
});
