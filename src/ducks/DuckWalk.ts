import { createAction, type Updatable } from "../actions";
import {
  cellToPos,
  getPosDiff,
  GroundArea,
  posToCell,
  randomBool,
  randomInt,
  type Direction,
  type RelativeDirection,
  type Vec2,
} from "../lib";
import type Play from "../Play";
import Timer, {
  ONE_MINUTE,
  ONE_SECOND,
  TEN_SECONDS,
  THIRTY_SECONDS,
} from "../Timer";
import type Duck from "./Duck";

export class RandomWalk implements DuckWalkUpdatable {
  static TAG: "random-walk" = "random-walk";
  readonly tag: "random-walk" = RandomWalk.TAG;

  private duck: Duck;
  private minCol: number;
  private maxCol: number;
  private minRow: number;
  private maxRow: number;
  private numTilesInSameDir: number;
  private isBlocked: boolean;
  private currPosStart: Vec2;
  private blockTimer: Timer;

  constructor(duck: Duck) {
    this.duck = duck;
    this.minCol = 1;
    this.maxCol = 7;
    this.minRow = 4;
    this.maxRow = duck.scene.art!.height / duck.scene.art!.tileSize - 2;
    this.numTilesInSameDir = 0;
    this.isBlocked = false;
    this.blockTimer = new Timer();
    this.currPosStart = { ...this.duck.pos };
  }

  private isWithinBounds(row: number, col: number): boolean {
    return (
      row >= this.minRow &&
      row <= this.maxRow &&
      col >= this.minCol &&
      col <= this.maxCol
    );
  }

  private isWalkableTile(row: number, col: number): boolean {
    if (!this.isWithinBounds(row, col)) return false;

    return this.duck.scene.grid.isTileWalkable({ row, col }, [
      GroundArea.POND,
      GroundArea.GRASS,
    ]);
  }

  init() {
    this.initDir();
    this.updateAnim();
  }

  private initDir() {
    const play = this.duck.scene as Play;
    const duckTile = posToCell(this.duck.pos, this.duck.scene.art.tileSize);
    const neighbourState = this.getNeighbourState();

    if (
      !neighbourState.f.isFree &&
      !neighbourState.l.isFree &&
      !neighbourState.r.isFree &&
      !neighbourState.b.isFree
    ) {
      this.isBlocked = true;
      return;
    }

    if (neighbourState.f.isFree) {
      this.duck.direction = neighbourState.f.dir;
      this.duck.scene.grid.occupyTile(this.duck.id,
        cellToPos(
          {
            col: duckTile.col + neighbourState.f.vec.x,
            row: duckTile.row + neighbourState.f.vec.y,
          },
          play.tileSize,
        ),
      );
    } else if (neighbourState.r.isFree) {
      this.duck.direction = neighbourState.r.dir;
      this.duck.scene.grid.occupyTile(this.duck.id,
        cellToPos(
          {
            col: duckTile.col + neighbourState.r.vec.x,
            row: duckTile.row + neighbourState.r.vec.y,
          },
          play.tileSize,
        ),
      );
    } else if (neighbourState.l.isFree) {
      this.duck.direction = neighbourState.l.dir;
      this.duck.scene.grid.occupyTile(this.duck.id,
        cellToPos(
          {
            col: duckTile.col + neighbourState.l.vec.x,
            row: duckTile.row + neighbourState.l.vec.y,
          },
          play.tileSize,
        ),
      );
    } else if (neighbourState.b.isFree) {
      this.duck.direction = neighbourState.b.dir;
      this.duck.scene.grid.occupyTile(this.duck.id,
        cellToPos(
          {
            col: duckTile.col + neighbourState.b.vec.x,
            row: duckTile.row + neighbourState.b.vec.y,
          },
          play.tileSize,
        ),
      );
    } else {
      throw new Error("Should not be blocked");
    }

    // unoccupy current cell since duck selected new target and update current start position
    this.duck.scene.grid.unoccupyTile(
      cellToPos(
        {
          col: duckTile.col,
          row: duckTile.row,
        },
        play.tileSize,
      ),
      ONE_SECOND * 1,
    );
  }

  update(_: number): void {
    const numTilesInDir = 2;
    const play = this.duck.scene as Play;
    const duckTile = posToCell(this.duck.pos, this.duck.scene.art.tileSize);

    const diff = getPosDiff(this.duck.pos, this.currPosStart);
    const pixelDiff = Math.max(Math.abs(diff.x), Math.abs(diff.y));

    // If duck moved one tile, determine next tile

    if (pixelDiff === this.duck.scene.art.tileSize) {
      const neighbourState = this.getNeighbourState();
      // console.log("DUCK UPDATE CHANGE TILE");
      // console.log(this.duck.pos, this.currPosStart);
      if (
        !neighbourState.f.isFree &&
        !neighbourState.l.isFree &&
        !neighbourState.r.isFree &&
        !neighbourState.b.isFree
      ) {
        // console.log("Duck has no tile to advance to, is blocked");
        // console.dir(duckTile);
        this.isBlocked = true;
        this.duck.animations.play(`idle-sit-${this.duck.direction}`);
        return;
      }

      let hasTurned = false;

      // Turn left or right

      if (this.numTilesInSameDir >= numTilesInDir) {
        // console.log(
        //   "Duck as moved x amount of tiles in the same direction and is about to change",
        // );

        const turnRight = randomBool();

        if (turnRight && neighbourState.r.isFree) {
          // console.log("Duck is turning right");
          this.duck.direction = neighbourState.r.dir;
          this.duck.scene.grid.occupyTile(this.duck.id,
            cellToPos(
              {
                col: duckTile.col + neighbourState.r.vec.x,
                row: duckTile.row + neighbourState.r.vec.y,
              },
              play.tileSize,
            ),
          );

          hasTurned = true;
        } else if (neighbourState.l.isFree) {
          // console.log("Duck is turning left");
          this.duck.direction = neighbourState.l.dir;
          this.duck.scene.grid.occupyTile(this.duck.id,
            cellToPos(
              {
                col: duckTile.col + neighbourState.l.vec.x,
                row: duckTile.row + neighbourState.l.vec.y,
              },
              play.tileSize,
            ),
          );
          hasTurned = true;
        } else if (neighbourState.r.isFree) {
          // console.log("Duck is turning right");
          this.duck.direction = neighbourState.r.dir;
          this.duck.scene.grid.occupyTile(this.duck.id,
            cellToPos(
              {
                col: duckTile.col + neighbourState.r.vec.x,
                row: duckTile.row + neighbourState.r.vec.y,
              },
              play.tileSize,
            ),
          );
          hasTurned = true;
        } else if (neighbourState.f.isFree) {
          // console.log(
          //   "Duck is continuing forward anyway bc right/left was blocked",
          // );
          this.duck.direction = neighbourState.f.dir;
          this.duck.scene.grid.occupyTile(this.duck.id,
            cellToPos(
              {
                col: duckTile.col + neighbourState.f.vec.x,
                row: duckTile.row + neighbourState.f.vec.y,
              },
              play.tileSize,
            ),
          );
        } else {
          // console.log(
          //   "Duck is continuing backwards anyway bc right/left/forwards was blocked",
          // );
          this.duck.direction = neighbourState.b.dir;
          this.duck.scene.grid.occupyTile(this.duck.id,
            cellToPos(
              {
                col: duckTile.col + neighbourState.b.vec.x,
                row: duckTile.row + neighbourState.b.vec.y,
              },
              play.tileSize,
            ),
          );

          hasTurned = true;
        }

        // unoccupy the cell the duck now has arrived to since we picked a new target tile above
      } else if (!neighbourState.f.isFree) {
        // console.log(
        //   "Duck should continue forward but is blocked and is turning left/right",
        // );

        if (neighbourState.r.isFree) {
          // console.log("Duck is turning right");
          this.duck.direction = neighbourState.r.dir;
          this.duck.scene.grid.occupyTile(this.duck.id,
            cellToPos(
              {
                col: duckTile.col + neighbourState.r.vec.x,
                row: duckTile.row + neighbourState.r.vec.y,
              },
              play.tileSize,
            ),
          );

          hasTurned = true;
        } else if (neighbourState.l.isFree) {
          // console.log("Duck is turning left");
          this.duck.direction = neighbourState.l.dir;
          this.duck.scene.grid.occupyTile(this.duck.id,
            cellToPos(
              {
                col: duckTile.col + neighbourState.l.vec.x,
                row: duckTile.row + neighbourState.l.vec.y,
              },
              play.tileSize,
            ),
          );
          hasTurned = true;
        } else if (neighbourState.b.isFree) {
          // console.log(
          //   "Duck is continuing backwards anyway bc right/left/forwards was blocked",
          // );
          this.duck.direction = neighbourState.b.dir;
          this.duck.scene.grid.occupyTile(this.duck.id,
            cellToPos(
              {
                col: duckTile.col + neighbourState.b.vec.x,
                row: duckTile.row + neighbourState.b.vec.y,
              },
              play.tileSize,
            ),
          );

          hasTurned = true;
        } else {
          throw new Error(
            "Duck is blocked, error in code,  blocked is early returned, should not happen",
          );
        }
      } else {
        // Should continue forward in the same direction don't do anything
        this.duck.direction = neighbourState.f.dir;
        this.duck.scene.grid.occupyTile(this.duck.id,
          cellToPos(
            {
              col: duckTile.col + neighbourState.f.vec.x,
              row: duckTile.row + neighbourState.f.vec.y,
            },
            play.tileSize,
          ),
        );
      }

      // unoccupy current cell since duck selected new target and update current start position
      this.duck.scene.grid.unoccupyTile(
        cellToPos(
          {
            col: duckTile.col,
            row: duckTile.row,
          },
          play.tileSize,
        ),
        ONE_SECOND * 3,
      );

      if (hasTurned) {
        this.numTilesInSameDir = 0;
      } else {
        this.numTilesInSameDir += 1;
      }

      this.currPosStart = { ...this.duck.pos };
    }

    this.updateAnim();
  }

  getNeighbourState(): {
    [key in RelativeDirection]: { dir: Direction; vec: Vec2; isFree: boolean };
  } {
    const duckTile = posToCell(this.duck.pos, this.duck.scene.art.tileSize);
    const directions: Direction[] = ["n", "e", "s", "w"];
    const directionToVec: Record<Direction, Vec2> = {
      n: { x: 0, y: -1 },
      ne: { x: 1, y: -1 },
      e: { x: 1, y: 0 },
      se: { x: 1, y: 1 },
      s: { x: 0, y: 1 },
      sw: { x: -1, y: 1 },
      w: { x: -1, y: 0 },
      nw: { x: -1, y: -1 },
    };
    const idxF = directions.indexOf(this.duck.direction);
    const idxB = idxF < 2 ? idxF + 2 : idxF - 2;
    const idxL = idxF === 0 ? directions.length - 1 : idxF - 1;
    const idxR = idxF === directions.length - 1 ? 0 : idxF + 1;

    const vecF = directionToVec[this.duck.direction];
    const vecR = directionToVec[directions[idxR]];
    const vecB = directionToVec[directions[idxB]];
    const vecL = directionToVec[directions[idxL]];

    const forwardIsFree = this.isWalkableTile(
      duckTile.row + vecF.y,
      duckTile.col + vecF.x,
    );

    const rightIsFree = this.isWalkableTile(
      duckTile.row + vecR.y,
      duckTile.col + vecR.x,
    );

    const backIsFree = this.isWalkableTile(
      duckTile.row + vecB.y,
      duckTile.col + vecB.x,
    );

    const leftIsFree = this.isWalkableTile(
      duckTile.row + vecL.y,
      duckTile.col + vecL.x,
    );

    return {
      f: {
        dir: this.duck.direction,
        vec: vecF,
        isFree: forwardIsFree,
      },
      r: {
        dir: directions[idxR],
        vec: vecR,
        isFree: rightIsFree,
      },
      b: {
        dir: directions[idxB],
        vec: vecB,
        isFree: backIsFree,
      },
      l: {
        dir: directions[idxL],
        vec: vecL,
        isFree: leftIsFree,
      },
    };
  }

  updateAnim() {
    const duckTile = posToCell(this.duck.pos, this.duck.scene.art.tileSize);
    const ground = this.duck.scene.grid.getGround({
      row: Math.round(duckTile.row),
      col: Math.round(duckTile.col),
    });

    if (
      ground === GroundArea.GRASS &&
      !this.duck.animations.isPlaying(`walk-${this.duck.direction}`)
    ) {
      this.duck.animations.play(`walk-${this.duck.direction}`);
    } else if (
      ground === GroundArea.POND &&
      !this.duck.animations.isPlaying(`swim-${this.duck.direction}`)
    ) {
      this.duck.animations.play(`swim-${this.duck.direction}`);
    }
  }

  isComplete(): boolean {
    return this.isBlocked;
  }
}

export class SittingDuck implements DuckWalkUpdatable {
  static TAG: "sitting-duck" = "sitting-duck";
  readonly tag: "sitting-duck" = SittingDuck.TAG;

  private duck: Duck;
  private timer: Timer;

  constructor(duck: Duck) {
    this.duck = duck;
    this.timer = new Timer();
  }

  init() {
    const duckTile = posToCell(this.duck.pos, this.duck.scene.art.tileSize);
    const ground = this.duck.scene.grid.getGround(duckTile);

    this.timer.start(ONE_SECOND * randomInt(1, 10));

    if (ground === GroundArea.GRASS) {
      this.duck.animations.play(`idle-sit-${this.duck.direction}`);
    } else if (ground === GroundArea.POND) {
      this.duck.animations.play(`idle-sit-water-${this.duck.direction}`);
    }
  }

  update(_: number): void {}

  isComplete(): boolean {
    return this.timer.isStopped;
  }
}

export class DuckWalk implements DuckWalkUpdatable {
  static TAG: "duck-walk" = "duck-walk";
  readonly tag: "duck-walk" = DuckWalk.TAG;

  private duck: Duck;
  private currAction: DuckWalkUpdatable | null;
  private timer: Timer;

  constructor(duck: Duck) {
    this.duck = duck;
    this.currAction = null;
    this.timer = new Timer();
  }

  init() {
    this.transitionToAction(RandomWalk.TAG, this.duck);
    this.timer.start(1000 * randomInt(1, 6));
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error("State class not initialized");

    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case RandomWalk.TAG:
          this.transitionToAction(SittingDuck.TAG, this.duck);
          break;
        case SittingDuck.TAG:
          this.transitionToAction(RandomWalk.TAG, this.duck);
      }
    }

    this.currAction.update(dt);
  }

  isComplete(): boolean {
    return false;
  }

  private transitionToAction<A extends keyof DuckWalkActionSpec>(
    tag: A,
    ...args: DuckWalkActionSpec[A]["args"]
  ) {
    this.currAction = createAction(tag, ...args);
    this.duck.action = tag;
    this.currAction.init();
  }
}

export interface DuckWalkUpdatable extends Updatable {
  readonly tag: DuckWalkActionTag;
}

const spec = {
  "duck-walk": { ctor: DuckWalk },
  "random-walk": { ctor: RandomWalk },
  "sitting-duck": { ctor: SittingDuck },
} as const;

export type DuckWalkActionTag = keyof DuckWalkActionSpec;

export type DuckWalkActionSpec = {
  [K in keyof typeof spec]: {
    args: ConstructorParameters<(typeof spec)[K]["ctor"]>;
    result: InstanceType<(typeof spec)[K]["ctor"]>;
  };
};

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor]),
) as { [K in DuckWalkActionTag]: (typeof spec)[K]["ctor"] };
