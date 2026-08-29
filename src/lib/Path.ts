import { createPathAStar } from "../grid.ts";
import Timer, { ONE_SECOND } from "../Timer.ts";
import { GroundArea, type Sprite } from "./index.ts";
import { ResolutionResult } from "./PathCollisionManager.ts";
import type { Tile, Direction, Vec2 } from "./types.ts";
import { tileToPos, getPosDiff, isSameTile, posToTile } from "./utils.ts";

// Get direction label by direction vector, first index is y delta and second index is x delta: directionLables[y + 1][x + 1]. Add + 1 since indexing doesn't start from -1.
const directionLables = [
  ["nw", "n", "ne"],
  ["w", "curr", "e"],
  ["sw", "s", "se"],
];

/**
 * Path responsible for directing the sprite along a path in the tile grid.
 *
 * - Creating a path via A*star from current position to goal position.
 * - Updating the direction/direction vector according to current tile and current goal tile.
 * - Checking for when sprite has moved a whole tile and updates current tile.
 * - Reserving intended next tile via the PathCollisionManager to avoid collisions with other sprites.
 * -
 *
 */
export default class Path {
  hasReachedGoal: boolean;
  isWaiting: boolean;

  private sprite: Sprite;
  private path: Tile[];
  private currPathIdx: number;
  private currStartPos: Vec2;
  private goalTile: Tile;
  private walkableTileValues: GroundArea[];
  private hasStarted: boolean;
  private waitingTimer: Timer;

  constructor(sprite: Sprite, goal: Vec2, walkableTileValues?: GroundArea[]) {
    this.sprite = sprite;

    this.goalTile = posToTile(goal, sprite.scene.art!.tileSize);
    this.walkableTileValues = walkableTileValues ?? [GroundArea.GRASS];
    this.isWaiting = false;

    this.path = [];

    this.currStartPos = { ...this.sprite.pos };
    this.currPathIdx = 0;
    this.hasReachedGoal = false;
    this.hasStarted = false;
    this.waitingTimer = new Timer();
  }

  getCurrentPath(): Tile[] {
    return this.path;
  }

  start() {
    this.sprite.currentPath = this;
    this.hasStarted = true;

    /**
     * I had occasional issues with sprites either starting or ending on a fraction of a tile which causes crashes.
     * I think most issues was due to how the browser suspended RAF so I changed the render loop handling of starting, stopping and deltas which seems to have solved these errors, but,
     * just in case for production, I leave this to not have unexpected drifts to cause the art to stop.
     */
    this.assertSpriteOnWholeTile();

    const startTile = posToTile(
      this.sprite.pos,
      this.sprite.scene.art.tileSize,
    );

    this.currStartPos = { ...this.sprite.pos };

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
      posToTile(this.sprite.pos, this.sprite.scene.art!.tileSize),
      this.goalTile,
      this.sprite.scene.grid.getGrid(),
      this.walkableTileValues,
    );

    // Occupy the start tile again
    this.sprite.scene.grid.occupyTile(this.sprite.id, this.sprite.pos);

    // Block the last tile of the path to prevent other sprite's from creating paths to the same destination
    // It's important that it happens after path creation since otherwise we will not find a path to the end.

    this.sprite.scene.grid.occupyTile(
      this.sprite.id,
      tileToPos(
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

    this.updateVelocityVector();
    this.updateDirection();
  }

  update(dt: number): void {
    if (this.hasReachedGoal || !this.hasStarted) return;

    this.updateVelocityVector();
    this.updateDirection();

    if (
      this.waitingTimer.isStarted &&
      !this.waitingTimer.isRunning &&
      this.isWaiting
    ) {
      this.isWaiting = false;
      this.waitingTimer.stop();
    }

    if (this.waitingTimer.isStarted) {
      this.waitingTimer.update(dt);
    }

    if (this.sprite.scene.collisions.hasResolutionresult(this.sprite.id)) {
      const resolutionResult = this.sprite.scene.collisions.getResolution(
        this.sprite.id,
      );

      if (resolutionResult.result === ResolutionResult.MOVE) {
        this.sprite.scene.collisions.commitMove(this.sprite.id);

        // Keep the sprite still for just a bit to separate it from whoever it was waiting for, to prevent flimmers of wait/move.

        this.waitingTimer.start(ONE_SECOND);
      } else {
        this.isWaiting = true;
      }
    } else if (!this.isWaiting) {
      const diff = getPosDiff(this.sprite.pos, this.currStartPos);
      const pixelDiff = Math.max(Math.abs(diff.x), Math.abs(diff.y));

      if (pixelDiff === this.sprite.scene.art.tileSize) {
        this.next();
      }
    }
  }

  private next() {
    this.currPathIdx++;

    this.currStartPos = {
      x: this.sprite.pos.x,
      y: this.sprite.pos.y,
    };

    if (this.currPathIdx === this.path.length - 1) {
      this.hasReachedGoal = true;
      /**
       * I had occasional issues with sprites either starting or ending on a fraction of a tile which causes crashes.
       * I think most issues was due to how the browser suspended RAF so I changed the render loop handling of starting, stopping and deltas which seems to have solved these errors, but,
       * just in case for production, I leave this to not have unexpected drifts to cause the art to stop.
       */
      this.assertSpriteOnWholeTile();
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

  private calculateVelocityVector(): Vec2 {
    const currTile = this.path[this.currPathIdx];

    if (this.currPathIdx === this.path.length - 1) {
      const prev = this.path[this.currPathIdx - 1];
      return { y: currTile.row - prev.row, x: currTile.col - prev.col };
    } else {
      const next = this.path[this.currPathIdx + 1];
      return { x: next.col - currTile.col, y: next.row - currTile.row };
    }
  }

  private updateDirection(): void {
    this.sprite.direction = directionLables[this.sprite.vel.y + 1][
      this.sprite.vel.x + 1
    ] as Direction;
  }

  private updateVelocityVector(): void {
    const vel = this.calculateVelocityVector();
    this.sprite.vel.x = vel.x;
    this.sprite.vel.y = vel.y;
  }

  private assertSpriteOnWholeTile(): void {
    const tileSize = this.sprite.scene.art.tileSize;

    if (
      !(
        this.sprite.pos.x % tileSize === 0 && this.sprite.pos.y % tileSize === 0
      )
    ) {
      console.error(
        "Sprite is on a path but the start/end position is not on a whole tile: ",
        {
          id: this.sprite.id,
          pos: { ...this.sprite.pos },
          tile: posToTile(this.sprite.pos, this.sprite.scene.art.tileSize),
          animation: this.sprite.animations.getPlaying(),
        },
      );

      this.sprite.pos = this.getWholeTilePos(this.sprite.pos);
    }
  }

  private getWholeTilePos(pos: Vec2): Vec2 {
    const tile = posToTile(pos, this.sprite.scene.art.tileSize);

    return tileToPos(
      { col: Math.round(tile.col), row: Math.round(tile.row) },
      this.sprite.scene.art.tileSize,
    );
  }
}
