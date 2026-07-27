import type {  Direction, Vec2 } from "./lib/types";


export function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "n":
      return "s";
    case "ne":
      return "sw";
    case "e":
      return "w";
    case "se":
      return "nw";
    case "s":
      return "n";
    case "sw":
      return "ne";
    case "w":
      return "e";
    case "nw":
      return "se";
  }
}

export function getGoalPositionWithDirectionAwareRounding(
  currentPos: Vec2,
  goalPos: Vec2,
  tileSize: number,
): Vec2 {
  const dirX = goalPos.x - currentPos.x;
  const dirY = goalPos.y - currentPos.y;

  let col = goalPos.x / tileSize;
  let row = goalPos.y / tileSize;

  col =
    dirX > 0 ? Math.floor(col) : dirX < 0 ? Math.ceil(col) : Math.round(col);
  row =
    dirY > 0 ? Math.floor(row) : dirY < 0 ? Math.ceil(row) : Math.round(row);

  return { x: col * tileSize, y: row * tileSize };
}

export function getStartPositionWithDirectionAwareRounding(
  currentPos: Vec2,
  goalPos: Vec2,
  tileSize: number,
): Vec2 {
  const dirX = goalPos.x - currentPos.x;
  const dirY = goalPos.y - currentPos.y;

  let col = currentPos.x / tileSize;
  let row = currentPos.y / tileSize;

  // Round based on approach direction
  col =
    dirX > 0 ? Math.ceil(col) : dirX < 0 ? Math.floor(col) : Math.round(col);
  row =
    dirY > 0 ? Math.ceil(row) : dirY < 0 ? Math.floor(row) : Math.round(row);

  return { x: col * tileSize, y: row * tileSize };
}
