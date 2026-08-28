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

    this.path = [];

    this.currStart = { ...this.sprite.pos };
    this.currPathIdx = 0;
    this.hasReachedGoal = false;
    this.cellCount = 0;
    this.hasStarted = false;
  }

  start() {
    this.sprite.currentPath = this;
    this.hasStarted = true;

    const startTile = posToCell(
      this.sprite.pos,
      this.sprite.scene.art.tileSize,
    );

    this.currStart = { ...this.sprite.pos };

    // Unoccupy start tile if it is a tile this sprite is standing on (TODO: can we avoid this).
    if (this.sprite.scene.grid.isTileOccupied(startTile)) {
      if (
        this.sprite.scene.grid.getSpriteAtOccupiedTile(startTile) ===
        this.sprite.id
      ) {
        this.sprite.scene.grid.unoccupyTile(this.sprite.id, this.sprite.pos);
      } else {
        throw new Error("Start tile of path is occupied by other sprite");
      }
    }

    // Create the path
    this.path = createPathAStar(
      posToCell(this.sprite.pos, this.sprite.scene.art!.tileSize),
      this.goalCell,
      this.sprite.scene.grid.getGrid(),
      this.walkableTileValues,
    );

    // Occupy the start tile again
    this.sprite.scene.grid.occupyTile(this.sprite.id, this.sprite.pos);

    // Block the last tile of the path to prevent other sprite's from creating paths to the same destination
    // It's important that it happens after path creation since otherwise we will not find a path to the end.

    this.sprite.scene.grid.occupyTile(
      this.sprite.id,
      cellToPos(
        this.path[this.path.length - 1],
        this.sprite.scene.art.tileSize,
      ),
    );

    // Push move intent to go to next path tile

    this.sprite.scene.collisions.pushIntent(
      this.sprite.id,
      this.path[this.currPathIdx],
      this.path[this.currPathIdx + 1],
    );

    this.updateVelocity();
    this.updateDirection();
  }

  update(_: number): void {
    if (this.hasReachedGoal || !this.hasStarted) return;

    this.updateVelocity();
    this.updateDirection();

    if (this.sprite.scene.collisions.hasResolutionresult(this.sprite.id)) {
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
      const tileSize = this.sprite.scene.art.tileSize;
      if (
        !(
          this.sprite.pos.x % tileSize === 0 &&
          this.sprite.pos.y % tileSize === 0
        )
      ) {
        const endTile = posToCell(this.sprite.pos, tileSize);

        console.log("PATH FINISHED BUT IT DRIFFTED?", {
          pos: { ...this.sprite.pos },
          tile: { ...endTile },
          animation: this.sprite.animations.getPlaying(),
        });
      }
    } else {
      // Push intent to go to next tile
      this.sprite.scene.collisions.pushIntent(
        this.sprite.id,
        this.path[this.currPathIdx],
        this.path[this.currPathIdx + 1],
      );
    }
  }

  finish() {
    if (this.sprite.currentPath === this) {
      this.sprite.currentPath = null;
    }
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
