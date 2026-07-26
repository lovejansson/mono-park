import { type Vec2 } from "./types";

export function posToCell(pos: Vec2, tileSize: number) {
    return {row: pos.y / tileSize, col: pos.x / tileSize}
}

