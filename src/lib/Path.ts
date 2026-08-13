import { createPathAStar } from "../grid.ts";
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
  private grid: any[][];
  private path: Cell[];
  private currPathIdx: number;
  private goalCell: Cell;
  private sprite: Sprite;
  private walkableTileValues: GroundArea[];

  constructor(
    sprite: Sprite,
    goal: Vec2,
    grid: any[][],
    walkableTileValues?: GroundArea[],
  ) {
    
    this.sprite = sprite;
    this.grid = grid;
    this.goalCell = posToCell(goal, sprite.scene.art!.tileSize);
    this.walkableTileValues = walkableTileValues ?? [GroundArea.GRASS];
    this.isWaiting = false;

    this.path = createPathAStar(
      posToCell(this.sprite.pos, this.sprite.scene.art!.tileSize),
      this.goalCell,
      this.grid,
      this.walkableTileValues,
    );


    this.currStart = { ...this.sprite.pos };
    this.currPathIdx = 0;
    this.hasReachedGoal = false;
    this.cellCount = 0;

   /**
    * 
    * INNAN EN PATH FÖR EN SPRITE SKAPAS vill jag blockera alla slot pos förutom min egen, skapa path, oblockera alla slot pos flrutom min egen, för attkunna gå till den men inte skapa väg genom de andra slot positioner 
    */
  }

  start() {
    this.sprite.currentPath = this;
    this.sprite.path.isOnPath = true;
    this.sprite.path.hasReachedGoal = false;

    this.updateVelocity();
    this.updateDirection();
  }

  preUpdate(_: number): void {
    if (!this.hasReachedGoal && !this.isWaiting) {
       
      this.updateVelocity();
      this.updateDirection();

      const diff = getPosDiff(this.sprite.pos, this.currStart);
      const pixelDiff = Math.max(Math.abs(diff.x), Math.abs(diff.y));

      if (pixelDiff === this.sprite.scene.art!.tileSize - 1) {
        console.log("PUSH")
        this.sprite.scene.collisions.pushIntent(
          this.sprite.id,
          this.path[this.currPathIdx],
          this.path[this.currPathIdx + 1],
        );
      }
    }
  }

  update(_: number): void {
    if (!this.hasReachedGoal) {
      if (!this.sprite.scene.collisions.hasMoveIntent(this.sprite.id)) return;

      const resolutionResult = this.sprite.scene.collisions.getResolution(
        this.sprite.id,
      );

      if (resolutionResult.result === ResolutionResult.MOVE) {
        this.isWaiting = false;
        if (!isSameCell(this.path[this.currPathIdx + 1], resolutionResult.tile))
          throw new Error(
            "Tile in move intent does not match with next tile in path! :<",
          );

        this.next();

        this.sprite.scene.collisions.commitMove(
          this.sprite.id,
          this.path[this.currPathIdx],
        );
      } else {
        console.log("WILL WAIT", this.sprite.id, this.path[this.currPathIdx]);
        this.isWaiting = true;
      }
    }
  }

  private next() {
    this.currPathIdx++;
    this.cellCount++;

    this.currStart = { x: this.sprite.pos.x += this.sprite.vel.x, y: this.sprite.pos.y += this.sprite.vel.y };

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
