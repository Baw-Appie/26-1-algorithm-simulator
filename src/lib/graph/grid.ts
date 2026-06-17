export const COLS = 30;
export const ROWS = 18;
export const CELLS = COLS * ROWS;

export const TILE = {
  WALL: 0, // 벽
  FLOOR: 1, // 일반 바닥
  CORRIDOR: 2, // 복도
  EXIT: 3 // 출구
} as const;

export type TileValue = (typeof TILE)[keyof typeof TILE];

export const idx = (x: number, y: number) => y * COLS + x;
export const xy = (cell: number): [number, number] => [cell % COLS, Math.floor(cell / COLS)];
// 일반 바닥, 복도, 출구는 모두 이동 가능하며 벽만 통과할 수 없다.
export const isWalkable = (grid: readonly TileValue[], cell: number) => grid[cell] !== TILE.WALL;

export function neighbors(cell: number): number[] {
  const [x, y] = xy(cell);
  const list = [];
  if (x > 0) list.push(cell - 1);
  if (x < COLS - 1) list.push(cell + 1);
  if (y > 0) list.push(cell - COLS);
  if (y < ROWS - 1) list.push(cell + COLS);
  return list;
}
