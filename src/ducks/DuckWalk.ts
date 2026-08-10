import { createAction, type Updatable } from "../actions";
import {
  cellToPos,
  getPosDiff,
  posToCell,
  randomBool,
  type Cell,
  type Direction,
  type RelativeDirection,
  type Vec2,
} from "../lib";
import type Play from "../Play";
import { GroundArea } from "../Play";
import Timer, { TEN_SECONDS } from "../Timer";
import type Duck from "./Duck";

export class RandomWalk implements DuckWalkUpdatable {
  static TAG: "random-walk" = "random-walk";
  readonly tag: "random-walk" = RandomWalk.TAG;

  private duck: Duck;
  private minCol: number;
  private maxCol: number;
  private minRow: number;
  private maxRow: number;
  private numTiles: number;
  private isBlocked: boolean;
  private currPosStart: Vec2;

  constructor(duck: Duck) {
    this.duck = duck;
    this.minCol = 0;
    this.maxCol = 7;
    this.minRow = 4;
    this.maxRow = Math.max(
      0,
      Math.floor(duck.scene.art!.height / duck.scene.art!.tileSize) - 1,
    );
    this.numTiles = 0;
    this.isBlocked = false;
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

    const tile = (this.duck.scene as Play).parkGrid[row]?.[col];

    return tile !== undefined && [GroundArea.GRASS, GroundArea.POND].includes(tile);
  }

  init() {
    this.updateAnim();
     console.log(this.duck.action, this.duck.animations.getPlaying())
  }

  update(_: number): void {
    
   console.log(this.duck.action, this.duck.animations.getPlaying())
    const numTilesInDir = 2;
    const play = this.duck.scene as Play;
    const duckTile = posToCell(this.duck.pos, this.duck.scene.art.tileSize);
    const diff = getPosDiff(this.duck.pos, this.currPosStart);
    const pixelDiff = Math.max(Math.abs(diff.x), Math.abs(diff.y));

    const neighbourState = this.getNeighbourState();

    // If duck moved one tile, determine next tile

    if (pixelDiff >= this.duck.scene.art.tileSize) {
      let hasTurned = false;

      // Turn left or right
      if (
        (this.numTiles >= numTilesInDir && neighbourState.r.isFree) ||
        neighbourState.l.isFree ||
        neighbourState.f.isFree
      ) {
        const turnRight = randomBool();

        if (turnRight && neighbourState.r.isFree) {
          this.duck.direction = neighbourState.r.dir;
          play.occupyCell(
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
          this.duck.direction = neighbourState.l.dir;
          play.occupyCell(
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
          this.duck.direction = neighbourState.r.dir;
          play.occupyCell(
            cellToPos(
              {
                col: duckTile.col + neighbourState.r.vec.x,
                row: duckTile.row + neighbourState.r.vec.y,
              },
              play.tileSize,
            ),
          );
          hasTurned = true;
        } else {
          this.duck.direction = neighbourState.f.dir;
          play.occupyCell(
            cellToPos(
              {
                col: duckTile.col + neighbourState.f.vec.x,
                row: duckTile.row + neighbourState.f.vec.y,
              },
              play.tileSize,
            ),
          );
        }

        // unoccupy the cell the duck now has arrived to since we picked a new target tile above
        play.unoccupyCell(
          cellToPos(
            {
              col: duckTile.col,
              row: duckTile.row,
            },
            play.tileSize,
          ),
        );
        this.currPosStart = { ...this.duck.pos };
        if (hasTurned) {
          this.numTiles = 0;
        } else {
          this.numTiles += 1;
        }
        this.updateAnim();
      } else {
        // Neither forward, right or left is free so we are blocked and will be sitting duck
        this.isBlocked = true;
      }
    }
  }

  getNeighbourState(): {
    [key in RelativeDirection]: { dir: Direction; vec: Vec2; isFree: boolean };
  } {
    const play = this.duck.scene as Play;
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
    const ground = (this.duck.scene as Play).parkGrid[duckTile.row][
      duckTile.col
    ];

    if (ground === GroundArea.GRASS) {
      this.duck.animations.play(`walk-${this.duck.direction}`);
    } else if (ground === GroundArea.POND) {
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
  private currAction: DuckWalkUpdatable | null;
  private timer: Timer;

  constructor(duck: Duck) {
    this.duck = duck;
    this.currAction = null;
    this.timer = new Timer();
  }

  init() {
    this.timer.start(TEN_SECONDS);
    this.transitionToAction(RandomWalk.TAG, this.duck);

    const duckTile = posToCell(this.duck.pos, this.duck.scene.art.tileSize);
    const ground = (this.duck.scene as Play).parkGrid[duckTile.row][
      duckTile.col
    ];

    if (ground === GroundArea.GRASS) {
      this.duck.animations.play(`stand-idle-${this.duck.direction}`);
    } else if (ground === GroundArea.POND) {
      this.duck.animations.play(`swim-${this.duck.direction}`);
    }
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error("State class not initialized");

    this.currAction.update(dt);

    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case RandomWalk.TAG:
      }
    }
  }

  isComplete(): boolean {
    return this.timer.isStopped;
  }

  private transitionToAction<A extends keyof DuckWalkActionSpec>(
    tag: A,
    ...args: DuckWalkActionSpec[A]["args"]
  ) {
    this.currAction = createAction(tag, ...args);
    this.currAction.init();
  }
}

export class DuckWalk implements DuckWalkUpdatable {
  static TAG: "duck-walk" = "duck-walk";
  readonly tag: "duck-walk" = DuckWalk.TAG;

  private duck: Duck;
  private currAction: DuckWalkUpdatable | null;

  constructor(duck: Duck) {
    this.duck = duck;
    this.currAction = null;
  }

  init() {
    this.transitionToAction(RandomWalk.TAG, this.duck);
  }

  update(dt: number): void {
  
    if (this.currAction === null)
      throw new Error("State class not initialized");

    this.currAction.update(dt);

    if (this.currAction.isComplete()) {
      
      switch (this.currAction.tag) {
        case RandomWalk.TAG:
          this.transitionToAction(SittingDuck.TAG, this.duck);
          break;
        case SittingDuck.TAG:
          this.transitionToAction(RandomWalk.TAG, this.duck);
      }
    }
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
