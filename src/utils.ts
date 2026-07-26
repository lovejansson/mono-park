import type { Cell, Vec2 } from "./lib/types";

export function isSamePos(pos1: Vec2, pos2: Vec2) {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

export function isSameCell(c1: Cell, c2: Cell) {
  return c1.col === c2.col && c1.row === c2.row;
}

export function posToCell(pos: Vec2, tileSize: number) {
  return {
    row: pos.y / tileSize,
    col: pos.x / tileSize,
  };
}

export function cellToPos(cell: Cell, tileSize: number) {
  return {
    y: cell.row * tileSize,
    x: cell.col * tileSize,
  };
}

export function dist(pos: Vec2, pos2: Vec2): Vec2 {
  return {x: pos.x - pos2.x, y: pos.y - pos2.y};
}
export function normalize(pos: Vec2): Vec2 {
  return {x: pos.x / Math.abs(pos.x), y: pos.y - Math.abs(pos.y)};
}


export function randomEl<T>(arr: T[]): T | null {
  return arr[Math.floor(Math.random() * arr.length)] ?? null;
}

export function randomIndex<T>(arr: T[]): number {
  if (arr.length === 0) return -1;

  return Math.floor(arr.length * Math.random());
}

export function randomInt(min: number, max: number) {
  return Math.round(Math.random() * (max - min)) + min;
}

export function randomOdd(max: number) {
  let num = Math.round(Math.random() * max);

  if (num % 2 === 0) {
    if (num === 0) num++;
    else num--;
  }

  return num;
}

export function getPosDiff(pos1: Vec2, pos2: Vec2): Vec2 {
  return { x: pos1.x - pos2.x, y: pos1.y - pos2.y };
}

export function randomBool() {
  return Math.random() > 0.5;
}

export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(b.row - a.row) + Math.abs(b.col - a.col);
}
