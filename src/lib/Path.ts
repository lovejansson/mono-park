import { createPathAStar } from "../grid.ts";
import type { Sprite } from "./index.ts";
import type { Cell, Direction, Vec2 } from "./types.ts";
import { getPosDiff, posToCell } from "./utils.ts";

// Get direction diff for x and why and use that as index to get label for direction. directionLables[y + 1][x + 1]
const directionLables = [
  ["nw", "n", "ne"],
  ["w", "curr", "e"],
  ["sw", "s", "se"],
];

/**
 * A path that a sprite can move on. Handles creation of path on the grid and updating of position (x,y).
 * You need to create a new instance whenever a sprite should walk on a path.
 * Supports 8 directional walks.
 */
export default class Path {
  hasReachedGoal: boolean;
  cellCount: number;

  private currStart: Vec2;
  private path: Cell[];
  private currPathIdx;
  private goalCell;
  private sprite: Sprite;

  constructor(sprite: Sprite, goal: Vec2, grid: (0 | 1)[][]) {
    this.sprite = sprite;
    this.goalCell = posToCell(goal, sprite.scene.art!.tileSize);

    console.log(
      "STARTING PATH",
      posToCell(this.sprite.pos, this.sprite.scene.art!.tileSize),
      this.goalCell,
    );

    this.path = createPathAStar(
      posToCell(this.sprite.pos, this.sprite.scene.art!.tileSize),
      this.goalCell,
      grid,
    );

    this.currStart = { ...this.sprite.pos };
    this.currPathIdx = 0;
    this.hasReachedGoal = false;
    this.cellCount = 0;
  }

  start() {
    this.sprite.path.isOnPath = true;
    this.sprite.path.hasReachedGoal = false;
    this.updateVelocity();
    this.updateDirection();
  }

  update(_: number) {
    if (!this.hasReachedGoal) {
      this.updateVelocity();
      this.updateDirection();

      // When sprite has moved a tile changed to next cell

      const diff = getPosDiff(this.sprite.pos, this.currStart);
      const pixelDiff = Math.max(Math.abs(diff.x), Math.abs(diff.y));

      if (pixelDiff === this.sprite.scene.art!.tileSize) {
        this.next();
      }
    }
  }

  private next() {
    this.currPathIdx++;
    this.cellCount++;

    this.currStart = { ...this.sprite.pos };

    if (this.currPathIdx === this.path.length - 1) {
      this.hasReachedGoal = true;
      this.sprite.path.hasReachedGoal = true;
    }
  }

  finish() {
    this.sprite.path.isOnPath = false;
    this.sprite.path.hasReachedGoal = false;
  }

  private calculateVelocity(): Vec2 {
    const currCell = this.path[this.currPathIdx];

    if (this.currPathIdx === this.path.length - 1) {
      const prev = this.path[this.currPathIdx - 1];
      return { y: currCell.row - prev.row, x: currCell.col - prev.col };
    } else {
      const next = this.path[this.currPathIdx + 1];
      return { x: next.col - currCell.col, y: next.row - currCell.row };
    }
  }

  private updateDirection(): void {
    this.sprite.direction = directionLables[this.sprite.vel.y + 1][
      this.sprite.vel.x + 1
    ] as Direction;
  }

  private updateVelocity(): void {
    const vel = this.calculateVelocity();
    this.sprite.vel.x = vel.x;
    this.sprite.vel.y = vel.y;
  }
}
