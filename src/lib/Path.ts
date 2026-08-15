import { createPathAStar } from "../grid.ts";
import { ONE_SECOND } from "../Timer.ts";
import { GroundArea, type Sprite } from "./index.ts";
import { ResolutionResult } from "./PathCollisionManager.ts";
import type { Cell, Direction, Vec2 } from "./types.ts";
import { cellToPos, getPosDiff, isSameCell, posToCell } from "./utils.ts";

// Get direction diff for x and why and use that as index to get label for direction. directionLables[y + 1][x + 1]
const directionLables = [
  ["nw", "n", "ne"],
  ["w", "curr", "e"],
  ["sw", "s", "se"],
];

export default class Path {
  hasReachedGoal: boolean;
  cellCount: number;
  isWaiting: boolean;

  private currStart: Vec2;
  private path: Cell[];
  private currPathIdx: number;
  private goalCell: Cell;
  private sprite: Sprite;
  private walkableTileValues: GroundArea[];
  private hasStarted: boolean;

  constructor(sprite: Sprite, goal: Vec2, walkableTileValues?: GroundArea[]) {
    this.sprite = sprite;

    this.goalCell = posToCell(goal, sprite.scene.art!.tileSize);
    this.walkableTileValues = walkableTileValues ?? [GroundArea.GRASS];
    this.isWaiting = false;

    this.path = createPathAStar(
      posToCell(this.sprite.pos, this.sprite.scene.art!.tileSize),
      this.goalCell,
      this.sprite.scene.grid.getGrid(),
      this.walkableTileValues,
    );

    this.currStart = { ...this.sprite.pos };
    this.currPathIdx = 0;
    this.hasReachedGoal = false;
    this.cellCount = 0;
    this.hasStarted = false;
  }

  start() {
    this.sprite.currentPath = this;
    this.sprite.path.isOnPath = true;
    this.sprite.path.hasReachedGoal = false;
    this.hasStarted = true;

    this.updateVelocity();
    this.updateDirection();
  }

  preUpdate(_: number): void {
    if (this.hasReachedGoal || this.isWaiting || !this.hasStarted) return;

    const diff = getPosDiff(this.sprite.pos, this.currStart);
    const pixelDiff = Math.max(Math.abs(diff.x), Math.abs(diff.y));

    // Standing on current tile in path and about to advance to the next, check if it is ok
    if (pixelDiff === 0) {
      this.sprite.scene.collisions.pushIntent(
        this.sprite.id,
        this.path[this.currPathIdx],
        this.path[this.currPathIdx + 1],
      );
    } 

    
      if (pixelDiff >= this.sprite.scene.art.tileSize) {
        this.next();
      }
  }

  update(_: number): void {
    if (this.hasReachedGoal || !this.hasStarted) return;

    this.updateVelocity();
    this.updateDirection();

    if (this.sprite.scene.collisions.hasMoveIntent(this.sprite.id)) {
      const resolutionResult = this.sprite.scene.collisions.getResolution(
        this.sprite.id,
      );

      if (resolutionResult.result === ResolutionResult.MOVE) {
        if (!isSameCell(this.path[this.currPathIdx + 1], resolutionResult.tile))
          throw new Error(
            "Tile in move intent does not match with next tile in path! :<",
          );

        this.sprite.scene.collisions.commitMove(this.sprite.id);

        // Keep the sprite still for just a bit to separate it from whoever it was waiting for, to prevent flimmers of wait/move
        setTimeout(() => {
          this.isWaiting = false;
        }, ONE_SECOND);

      } else {
        this.isWaiting = true;
      }
    } else if (!this.isWaiting) {
      const diff = getPosDiff(this.sprite.pos, this.currStart);
      const pixelDiff = Math.max(Math.abs(diff.x), Math.abs(diff.y));

      if (pixelDiff === this.sprite.scene.art.tileSize) {
        this.next();
      }
    }
  }

  private next() {
    this.currPathIdx++;
    this.cellCount++;

    this.currStart = {
      x: this.sprite.pos.x,
      y: this.sprite.pos.y,
    };

    if (this.currPathIdx === this.path.length - 1) {
      this.hasReachedGoal = true;
      this.sprite.path.hasReachedGoal = true;
    }
  }

  finish() {
    if (this.sprite.currentPath === this) {
      this.sprite.currentPath = null;
    }
    this.sprite.path.isOnPath = false;
    this.sprite.path.hasReachedGoal = false;
  }

  getCurrentPath(): Cell[] {
    return this.path;
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
