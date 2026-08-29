import { type Tile, type Vec2 } from "./types";

export function isSamePos(pos1: Vec2, pos2: Vec2): boolean {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

export function isSameTile(c1: Tile, c2: Tile): boolean {
  return c1.col === c2.col && c1.row === c2.row;
}

export function posToTile(pos: Vec2, tileSize: number): Tile {
  return {
    row: pos.y / tileSize,
    col: pos.x / tileSize,
  };
}

export function tileToPos(tile: Tile, tileSize: number): Vec2 {
  return {
    y: tile.row * tileSize,
    x: tile.col * tileSize,
  };
}

export function dist(pos: Vec2, pos2: Vec2): Vec2 {
  return { x: pos.x - pos2.x, y: pos.y - pos2.y };
}

export function normalize(pos: Vec2): Vec2 {
  return { x: pos.x / Math.abs(pos.x), y: pos.y - Math.abs(pos.y) };
}

export function randomEl<T>(arr: T[]): T | null {
  return arr[Math.floor(Math.random() * arr.length)] ?? null;
}

export function randomIndex<T>(arr: T[]): number {
  if (arr.length === 0) return -1;

  return Math.floor(arr.length * Math.random());
}

export function randomInt(min: number, max: number): number {
  return Math.round(Math.random() * (max - min)) + min;
}

export function randomOdd(max: number): number {
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

export function randomBool(): boolean {
  return Math.random() > 0.5;
}

export function manhattan(a: Tile, b: Tile): number {
  return Math.abs(b.row - a.row) + Math.abs(b.col - a.col);
}

export function euclidean(pos1: Vec2, pos2: Vec2): number {
  return Math.round(
    Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)),
  );
}

export function easeOut(x: number, strength: number = 2): number {
  return 1 - Math.pow(1 - x, strength);
}

export function roundToDecimal(n: number, d: number): number {
  return Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
}
