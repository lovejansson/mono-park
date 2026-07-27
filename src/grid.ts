import type { Cell } from "./lib/types";
import { isSameCell, randomEl } from "./lib";

export function createGrid(
  rows: number,
  cols: number,
  defaultCellValue: any = null,
) {
  const grid = [];
  for (let r = 0; r < rows; ++r) {
    const row = [];
    for (let c = 0; c < cols; ++c) {
      const value = defaultCellValue;
      row.push(value);
    }

    grid.push(row);
  }

  return grid;
}

export function findClosestFreeCell(
  from: Cell,
  grid: (0 | 1)[][],
  walkableTileValues: number[] = [0],
) {
  const rows = grid.length;
  const cols = grid[0].length;

  const visited: boolean[][] = createGrid(rows, cols, false);
  const queue: Cell[] = [];

  let curr: Cell = { ...from };

  queue.push(from);

  visited[from.row][from.col] = true;

  while (queue.length > 0) {
    curr = queue.shift()!; // I know it is not empty since while loop is only running when length > 0.

    for (const n of getNeighbours(curr, grid)) {
      if (walkableTileValues.includes(grid[n.row][n.col])) {
        return n;
      } else if (!visited[n.row][n.col]) {
        queue.push(n);
        visited[n.row][n.col] = true;
      }
    }
  }

  return null;
}

export function getRandomFreeCell(
  grid: (0 | 1)[][],
  walkableTileValues: number[] = [0],
) {
  const freeCells: Cell[] = [];

  for (let r = 0; r < grid.length; ++r) {
    for (let c = 0; c < grid[r].length; ++c) {
      if (walkableTileValues.includes(grid[r][c])) {
        freeCells.push({ row: r, col: c });
      }
    }
  }

  return randomEl(freeCells);
}

export function createPathAStar(
  from: Cell,
  to: Cell,
  grid: (0 | 1)[][],
  walkableTileValues: number[] = [0],
): Cell[] {
  // if (!cellIsWithinBounds(from, grid))
  //   throw new Error("'from' cell is out of bounds");
  // if (!cellIsWithinBounds(to, grid))
  //   throw new Error("'to' cell is out of bounds");

  // console.log(from, to);

  if(isSameCell(from, to)) throw new Error("from cell and to cell are the same!")
  

  const rows = grid.length;
  const cols = grid[0].length;

  const manhattan = (a: Cell, b: Cell) =>
    Math.abs(b.row - a.row) + Math.abs(b.col - a.col);

  const heuristic = manhattan;

  const reconstructPath = (pathMap: (Cell | null)[][]): Cell[] => {
    let curr: Cell | null = to;
    const path: Cell[] = [to];

    while (curr) {
      curr = pathMap[curr.row][curr.col];
      if (curr) path.push(curr);
    }

    return path.reverse();
  };

  const openList: Cell[] = [from];
  const closeList: Cell[] = [];

  const pathMap = createGrid(rows, cols, null);
  const gScores = createGrid(rows, cols, Infinity);
  const fScores = createGrid(rows, cols, Infinity);

  gScores[from.row][from.col] = 0;
  fScores[from.row][from.col] = heuristic(from, to);

  while (openList.length > 0) {
    // Find cell with current lowest f score
    const curr = openList.reduce((lowestF, c) =>
      fScores[c.row][c.col] < fScores[lowestF.row][lowestF.col] ? c : lowestF,
    );

    if (curr.row === to.row && curr.col === to.col) break;

    const neighbours = getNeighbours(curr, grid);
    const estimateG = gScores[curr.row][curr.col] + 1;

    for (const n of neighbours) {
      // Skip non-walkable
      if (!walkableTileValues.includes(grid[n.row][n.col])) continue;

      const h = heuristic(n, to);
      const f = estimateG + h;

      const inClosed = closeList.find(
        (c) => c.row === n.row && c.col === n.col,
      );
      const inOpen = openList.find((c) => c.row === n.row && c.col === n.col);

      // Update g and f scores if the new g is better than current g
      if (estimateG < gScores[n.row][n.col]) {
        gScores[n.row][n.col] = estimateG;
        fScores[n.row][n.col] = f;
        pathMap[n.row][n.col] = curr;

        if (inClosed) {
          closeList.splice(closeList.indexOf(n), 1);
          openList.push(n);
        } else if (!inOpen) {
          openList.push(n);
        }
      }
    }

    // curr is processed and done, remove from open list
    const index = openList.findIndex(
      (c) => c.row === curr.row && c.col === curr.col,
    );
    if (index !== -1) openList.splice(index, 1);

    // Add curr to close list so that it can be brought back if better path to it is found
    closeList.push(curr);
  }

  if (!pathMap[to.row][to.col]) {
    throw new Error("No path found!");
  }

  return reconstructPath(pathMap);
}

export function getNeighbours(
  cell: Cell,
  grid: (0 | 1)[][],
  includeDiagonalNeighbours = false,
): Cell[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const neighbours: Cell[] = [];

  const neighbourDiffs = includeDiagonalNeighbours
    ? [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ]
    : [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
      ];

  for (const [r, c] of neighbourDiffs) {
    const n = { row: cell.row + r, col: cell.col + c };
    if (n.row !== -1 && n.col !== -1 && n.row !== rows && n.col !== cols)
      neighbours.push(n);
  }

  return neighbours;
}
