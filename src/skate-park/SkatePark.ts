import type Play from "../Play.ts";
import Skater from "./Skater.ts";
import {
  randomBool,
  randomEl,
  randomInt,
  cellToPos,
  posToCell,
  isSamePos,
} from "../lib";
import { Path } from "../lib";
import Timer, { FIVE_MINUTES, TEN_MINUTES } from "../Timer.ts";
import Obstacle, {
  obstacles,
  obstacleTricks,
  tricks,
  type ObstacleType,
  type Trick,
  BowlSide,
  Rail,
  RailSide,
  Bowl,
  bowlSideToStartDir,
} from "./Obstacle";
import { TransitionType, type SequenceAnimation } from "../lib";
import { AnimationSequence, type Direction, type Vec2 } from "../lib";
import { findClosestFreeCell } from "../grid.ts";
import { getBoardCarryOverlay, getBoardFlipOverlay } from "./Skater.ts";
import type Bench from "../Bench.ts";
import { createAction, type Updatable } from "../actions.ts";

function occupySkaterCell(skater: Skater, pos: Vec2 = skater.pos): void {
  (skater.scene as Play).occupyCell(pos);
}

function unoccupySkaterCell(skater: Skater): void {
  (skater.scene as Play).unoccupyCell(skater.pos);
}

function snapSkaterToWholeTile(skater: Skater): void {
  const cell = posToCell(skater.pos, skater.tileSize);
  cell.col = Math.round(cell.col);
  cell.row = Math.round(cell.row);
  skater.pos = cellToPos(cell, skater.tileSize);
}

export default class SkatingAtPark implements SkateUpdatable {
  static tag: "skating-at-park" = "skating-at-park";
  readonly tag: "skating-at-park" = SkatingAtPark.tag;

  private skater: Skater;
  private tricks: Trick[];
  private obstacles: ObstacleType[];
  private currAction: SkateUpdatable | null;
  private obstacle: Obstacle | null;
  private bench: Bench | null;
  private tileSize: number;

  constructor(skater: Skater) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.tileSize = this.skater.tileSize;
    this.tricks = tricks.slice(0, skater.skill - 1);
    this.obstacles = obstacles.filter((o) =>
      obstacleTricks[o].some((t1) => this.tricks.includes(t1)),
    );

    this.currAction = null;
    this.obstacle = null;
    this.bench = null;
  }

  init() {}

  update(dt: number): void {
    if (this.currAction === null) {
      switch (this.skater.initAction) {
        case "bench":
          this.bench = randomEl(
            (this.skater.scene as Play).benches.filter(
              (o) => o.isFree && o.isAtSkatePark,
            ),
          )!;

          this.bench.isFree = false;

          this.obstacle = null;

          occupySkaterCell(this.skater, {
            x: this.bench.pos.x,
            y: this.bench.pos.y + this.tileSize * 2,
          });
          this.currAction = createAction(CruiseTo.TAG, this.skater, {
            x: this.bench.pos.x,
            y: this.bench.pos.y + this.tileSize * 2,
          });
          break;
        case "rail":
          const obstacle = (this.skater.scene as Play).obstacles.find(
            (o) => o.type === "rail",
          );

          if (obstacle === undefined) throw new Error("No rail obstacle found");

          this.obstacle = obstacle;

          this.obstacle.arrive(this.skater.id);

          occupySkaterCell(
            this.skater,
            this.obstacle!.getArrivePos(this.skater.pos),
          );
          this.currAction = createAction(
            CruiseTo.TAG,
            this.skater,
            this.obstacle!.getArrivePos(this.skater.pos),
          );
          break;
        case "bowl":
          this.obstacle = (this.skater.scene as Play).obstacles.find(
            (o) => o.type === "bowl",
          )!;
          this.obstacle.arrive(this.skater.id);

          occupySkaterCell(
            this.skater,
            this.obstacle!.getArrivePos(this.skater.pos),
          );
          this.currAction = createAction(
            CruiseTo.TAG,
            this.skater,
            this.obstacle!.getArrivePos(this.skater.pos),
          );
          break;
        case "flat":
          this.obstacle = (this.skater.scene as Play).obstacles.find(
            (o) => o.type === "flat",
          )!;

          this.obstacle.arrive(this.skater.id);

          occupySkaterCell(
            this.skater,
            this.obstacle!.getArrivePos(this.skater.pos),
          );
          this.currAction = createAction(
            CruiseTo.TAG,
            this.skater,
            this.obstacle!.getArrivePos(this.skater.pos),
          );

          console.log(this.obstacle);
          break;
      }
      // const hasFreeObstacles =
      //   (this.skater.scene as Play).obstacles.find(
      //     (o) => !o.isTooCrowded() && this.obstacles.includes(o.type),
      //   ) !== undefined;
      // const hasFreeBenches = (this.skater.scene as Play).benches.find(
      //   (b) => b.isFree,
      // );

      // const willSkate = randomBool() && hasFreeObstacles;

      // if (willSkate) {
      //   for (let i = 0; i < this.obstacles.length; ++i) {
      //     const obstacleType = randomEl(this.obstacles);
      //     this.obstacle = (this.skater.scene as Play).obstacles.find(
      //       (o) => o.type === obstacleType,
      //     )!;
      //     if (!this.obstacle.isTooCrowded()) break;
      //   }

      //   if (this.obstacle && this.obstacle.isTooCrowded()) {
      //     return;
      //   }

      //   this.obstacle!.arrive(this.skater.id);

      //   this.currAction = createAction(
      //     CruiseTo.TAG,
      //     this.skater,
      //     this.obstacle!.getArrivePos(
      //       this.obstacle!.type === "ramp"
      //         ? (this.obstacle as Ramp).getMyIdlePos(this.skater.id)
      //         : this.skater.pos,
      //     ),
      //   );
      // } else if (hasFreeBenches) {
      //   console.log("WILL IDLE");
      //   this.bench = randomEl(
      //     (this.skater.scene as Play).benches.filter((o) => o.isFree),
      //   )!;

      //   this.bench.isFree = false;

      //   this.obstacle = null;

      //   this.currAction = createAction(CruiseTo.TAG, this.skater, {
      //     x: this.bench.pos.x,
      //     y: this.bench.pos.y + this.tileSize,
      //   });
      // }
    } else if (this.currAction.isComplete()) {
      if (this.currAction.tag === CruiseTo.TAG) {
        if (this.obstacle !== null) {
          this.skater.obstacle = this.obstacle.id;
          switch (this.obstacle.type) {
            case "rail":
              this.currAction = createAction(
                this.obstacle.type,
                this.skater,
                this.obstacle as Rail,
                TEN_MINUTES,
              );
              break;
            case "bowl":
              this.currAction = createAction(
                this.obstacle.type,
                this.skater,
                this.obstacle as Bowl,
                TEN_MINUTES,
              );
              break;
            case "flat":
              this.currAction = createAction(
                this.obstacle.type,
                this.skater,
                this.obstacle as Obstacle,
                TEN_MINUTES,
              );
              break;
          }
        } else if (this.bench !== null) {
          this.skater.bench = this.bench.id;
          this.currAction = createAction(
            SittingBench.TAG,
            this.skater,
            this.bench,
            FIVE_MINUTES,
          );
        } else {
          throw new Error("Invalid state: bench and obstacle is null");
        }
      } else {
        unoccupySkaterCell(this.skater);
        if (this.currAction.tag === SittingBench.TAG) {
          this.bench!.isFree = true;
          this.bench = null;
        } else {
          this.obstacle = null;
        }
        const hasFreeObstacles =
          (this.skater.scene as Play).obstacles.find(
            (o) => !o.isTooCrowded() && this.obstacles.includes(o.type),
          ) !== undefined;
        const hasFreeBenches = (this.skater.scene as Play).benches.find(
          (b) => b.isFree,
        );

        const willSkate = randomBool() && hasFreeObstacles;

        if (willSkate) {
          for (let i = 0; i < this.obstacles.length; ++i) {
            const obstacleType = randomEl(this.obstacles);
            this.obstacle = (this.skater.scene as Play).obstacles.find(
              (o) => o.type === obstacleType,
            )!;
            if (!this.obstacle.isTooCrowded()) break;
          }

          if (this.obstacle && this.obstacle.isTooCrowded()) {
            return;
          }

          this.obstacle!.arrive(this.skater.id);

          occupySkaterCell(
            this.skater,
            this.obstacle!.getArrivePos(this.skater.pos),
          );
          this.currAction = createAction(
            CruiseTo.TAG,
            this.skater,
            this.obstacle!.getArrivePos(this.skater.pos),
          );
        } else if (hasFreeBenches) {
          this.bench = randomEl(
            (this.skater.scene as Play).benches.filter((o) => o.isFree),
          )!;

          this.bench.isFree = false;
          this.obstacle = null;

          occupySkaterCell(this.skater, {
            x: this.bench.pos.x,
            y: this.bench.pos.y + this.tileSize,
          });
          this.currAction = createAction(CruiseTo.TAG, this.skater, {
            x: this.bench.pos.x,
            y: this.bench.pos.y + this.tileSize,
          });
        }
      }
    }

    if (this.currAction !== null) this.currAction.update(dt);
  }

  isComplete(): boolean {
    return false;
  }
}

class RailObstacle implements SkateUpdatable {
  static tag: "rail" = "rail";
  readonly tag: "rail" = RailObstacle.tag;

  private skater: Skater;
  private timer: Timer;
  private currAction: null | SkateUpdatable;
  private obstacle: Rail;
  private tileSize: number;

  constructor(skater: Skater, obstacle: Rail, ms: number) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.timer = new Timer();
    this.timer.start(ms);
    this.currAction = null;
    this.obstacle = obstacle;
    this.tileSize = this.skater.tileSize;
  }

  update(dt: number): void {
    if (this.currAction === null) {
      this.obstacle.standInLine(this.skater.id);
      this.init();
      this.currAction = new WaitingMyTurn(this.skater, this.obstacle);
    } else if (this.currAction.isComplete()) {
      if (this.currAction.tag === WaitingMyTurn.TAG) {
        snapSkaterToWholeTile(this.skater);
        unoccupySkaterCell(this.skater);
        const start = this.obstacle.getClosestTrickStartPos(this.skater.pos);
        this.currAction = createAction(
          RailTricks.TAG,
          this.skater,
          this.obstacle,
          start,
        );
      } else if (this.currAction.tag === RailTricks.TAG) {
        this.obstacle.endSkate(this.skater.id);
        this.obstacle.standInLine(this.skater.id);
        this.currAction = new WaitingMyTurn(this.skater, this.obstacle);
      }
    }

    this.currAction.update(dt);
  }

  isComplete(): boolean {
    return (
      this.timer.isStopped &&
      this.currAction !== null &&
      this.currAction.isComplete()
    );
  }

  init(): void {
    if (this.skater.pos.y <= this.obstacle.pos.y) {
      this.skater.direction = "s";
      this.skater.animations.play("idle-stand-s", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    } else {
      this.skater.direction = "n";
      this.skater.animations.play("idle-stand-n", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    }
  }
}

class FlatObstacle implements SkateUpdatable {
  static tag: "flat" = "flat";
  readonly tag: "flat" = FlatObstacle.tag;
  private skater: Skater;
  private animationSeq: AnimationSequence;
  private timer: Timer;

  constructor(skater: Skater, obstacle: Obstacle, ms: number) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.skater.direction = randomEl(["s", "n"]) as Direction;

    this.animationSeq = new AnimationSequence(
      this.skater,
      FlatObstacle.CreateAnimationSequence(this.skater.direction),
    );
    this.timer = new Timer();
    this.timer.start(ms);

    this.animationSeq.start();
  }

  init() {}

  update(dt: number) {
    this.animationSeq.update(dt);
    if (this.animationSeq.isFinished) {
      this.animationSeq = new AnimationSequence(
        this.skater,
        FlatObstacle.CreateAnimationSequence(this.skater.direction),
      );

      this.animationSeq.start();
    }
  }

  isComplete(): boolean {
    return this.timer.isStopped;
  }

  static CreateAnimationSequence(direction: Direction): SequenceAnimation[] {
    const trick = randomEl(obstacleTricks["flat"]);

    const flipside = direction === "n" ? "b" : "f";

    const seq: SequenceAnimation[] = [
      AnimationSequence.createAnim({
        anim: `idle-stand-board-${direction}`,
        type: TransitionType.Time,
        transition: { duration: 2000 },
      }),
      AnimationSequence.createAnim({
        anim: `prep-${direction}`,
        type: TransitionType.Finished,
        transition: null,
      }),
      AnimationSequence.createAnim({
        anim: `${trick?.includes("shove-it") ? "shove-it" : trick}-${flipside}`,
        type: TransitionType.Finished,
        transition: null,
      }),
    ];

    return seq;
  }
}

class RailTricks implements SkateUpdatable {
  static TAG: "rail-tricks" = "rail-tricks";
  readonly tag: "rail-tricks" = RailTricks.TAG;

  static CRUISE_SPEED = 4;
  static GRIND_SPEED = 4;
  static TRICK_SPEED = 4;
  static WALK_SPEED = 1;
  static WALK_FAST_SPEED = 2;

  private obstacle: Rail;
  private skater: Skater;
  private animationSequence: AnimationSequence;
  private tileSize: number;
  private path: Path | null;
  private returnedToIdleWithoutPath: boolean;

  private step: "start" | "rail" | "return";

  private start: { pos: Vec2; railSide: RailSide };

  constructor(
    skater: Skater,
    obstacle: Rail,
    start: { pos: Vec2; railSide: RailSide },
  ) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.tileSize = this.skater.tileSize;
    this.obstacle = obstacle;

    this.path = null;
    this.returnedToIdleWithoutPath = false;

    if (isSamePos(start.pos, skater.pos)) {
      this.step = "rail";
    } else {
      this.step = "start";
    }
    this.start = start;

    const trickOne = randomBool() ? randomEl(["shove-it", "kickflip"]) : null;
    const trickTwo =
      trickOne === null && randomBool()
        ? randomEl(["shove-it", "kickflip"])
        : null;

    const tilesKickflip = Math.abs(
      this.skater.animations.getEstimatedDistanceForAnim("kickflip-f", {
        x: Skater.TRICK_SPEED,
        y: 0,
      }).x / this.tileSize,
    );
    const tilesShoveIt = Math.abs(
      this.skater.animations.getEstimatedDistanceForAnim("shove-it-f", {
        x: Skater.TRICK_SPEED,
        y: 0,
      }).x / this.tileSize,
    );

    const tilesTrickTwo =
      trickTwo === "kickflip"
        ? tilesKickflip
        : trickTwo === "shove-it"
          ? tilesShoveIt
          : 0;

    const tilesTrickOne =
      trickOne === "kickflip"
        ? tilesKickflip
        : trickOne === "shove-it"
          ? tilesShoveIt
          : 0;

    const sequence = RailTricks.CreateAnimationSequence({
      startSide: this.start.railSide,
      tilesAfterRail: 1,
      tilesGrind:
        this.obstacle.width / this.tileSize - tilesTrickOne - tilesTrickTwo,
      tileSize: this.tileSize,
      tilesToRail: 2,
      trickOne: trickOne,
      trickTwo: trickTwo,
      tilesTrickOne,
      tilesTrickTwo,
    });

    this.animationSequence = new AnimationSequence(
      this.skater,
      sequence,
      (anim) => {
        // console.log(anim);
        // console.log("Skater X ", this.skater.pos.x);
      },
    );
  }

  init() {}

  update(dt: number): void {
    const animName = this.skater.animations.getPlaying();

    switch (this.step) {
      case "start": {
        if (this.path === null) {
          this.path = new Path(
            this.skater,
            this.start.pos,
            (this.skater.scene as Play).parkGrid,
            [2],
          );

          this.path.start();

          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlay: getBoardCarryOverlay(this.skater.direction),
          });
        } else if (this.path.hasReachedGoal) {
          this.step = "rail";
          this.path.finish();
          this.path = null;
        } else {
          this.path.update(dt);

          // Change animation if skater changed direction
          if (
            !this.skater.animations.isPlaying(
              `walk-board-${this.skater.direction}`,
            )
          ) {
            this.skater.animations.play(`walk-board-${this.skater.direction}`, {
              overlay: getBoardCarryOverlay(this.skater.direction),
            });
          }
        }

        break;
      }
      case "rail": {
        if (!this.animationSequence.hasStarted()) {
          this.skater.direction =
            this.start.railSide === RailSide.LEFT ? "e" : "w";
          // console.log(
          //   "START ANIM SEQ POS: ",
          //   this.skater.pos.x,
          //   posToCell(this.skater.pos, this.tileSize),
          // );
          this.animationSequence.start();
        }

        this.animationSequence.update(dt);

        if (this.animationSequence.isFinished) {
          // console.log(
          //   "START ANIM SEQ FINISHED: ",
          //   this.skater.pos.x,
          //   posToCell(this.skater.pos, this.tileSize),
          // );
          this.step = "return";
        }
        break;
      }
      case "return": {
        if (this.path === null) {
          const currCell = posToCell(this.skater.pos, this.tileSize);

          // console.log("START RETURN: ", this.skater.pos.x, currCell);

          currCell.col = Math.round(currCell.col);
          currCell.row = Math.round(currCell.row);

          this.skater.pos = cellToPos(currCell, this.tileSize);

          const closestCell = findClosestFreeCell(
            currCell,
            (this.skater.scene as Play).getWalkabilityGrid(),
            [2],
          );

          if (closestCell === null) throw Error("WHY");

          const idlePos = cellToPos(closestCell, this.tileSize);
          occupySkaterCell(this.skater, idlePos);

          if (isSamePos(idlePos, this.skater.pos)) {
            this.returnedToIdleWithoutPath = true;
            this.playReturnIdleAnimation();
            break;
          }

          this.path = new Path(
            this.skater,
            idlePos,
            (this.skater.scene as Play).parkGrid,
            [2],
          );

          this.path.start();

          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlay: getBoardCarryOverlay(this.skater.direction),
          });
        } else if (this.path.hasReachedGoal) {
          this.playReturnIdleAnimation();
          this.path.finish();
          // this.path = null;
        } else {
          if (
            !this.skater.animations.isPlaying(
              `walk-board-${this.skater.direction}`,
            )
          ) {
            this.skater.animations.play(`walk-board-${this.skater.direction}`, {
              overlay: getBoardCarryOverlay(this.skater.direction),
            });
          }
          this.path.update(dt);
        }

        break;
      }
    }
  }

  isComplete(): boolean {
    return (
      this.step === "return" &&
      ((this.path !== null && this.path.hasReachedGoal) ||
        this.returnedToIdleWithoutPath) &&
      (this.skater.animations.getPlaying()?.includes("idle") ?? false)
    );
  }

  private playReturnIdleAnimation(): void {
    if (this.skater.pos.y < this.obstacle.pos.y) {
      this.skater.direction = "s";
      this.skater.animations.play("idle-stand-s", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    } else if (this.skater.pos.y > this.obstacle.pos.y + this.obstacle.height) {
      this.skater.direction = "n";
      this.skater.animations.play("idle-stand-n", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    } else if (this.skater.pos.x > this.obstacle.pos.x) {
      this.skater.direction = "w";
      this.skater.animations.play("idle-stand-w", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    } else {
      this.skater.direction = "e";
      this.skater.animations.play("idle-stand-e", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    }
  }

  static CreateAnimationSequence(params: {
    startSide: RailSide;
    tileSize: number;
    tilesToRail: number;
    tilesGrind: number;
    tilesAfterRail: number;
    trickOne: string | null;
    trickTwo: string | null;
    tilesTrickOne: number;
    tilesTrickTwo: number;
  }): SequenceAnimation[] {
    const {
      startSide,
      tileSize,
      tilesToRail,
      tilesGrind,
      trickOne,
      trickTwo,
      tilesAfterRail,
      tilesTrickOne,
      tilesTrickTwo,
    } = params;

    const sequence: SequenceAnimation[] = [];

    const isGoingRight = startSide === RailSide.LEFT;

    const dir = isGoingRight ? "b-e" : "f-w"; // Whenever skater is going to e the stance is b and the opposite.
    const dxSign = isGoingRight ? 1 : -1;

    const tilesJumpOne = 1;
    const tilesJumpTwo = trickTwo !== null ? 1.25 : 0.5;

    const tilesX =
      tilesToRail +
      tilesJumpOne +
      tilesTrickOne +
      tilesGrind +
      tilesJumpTwo +
      tilesTrickTwo;

    const diffToEvenTiles = Math.ceil(tilesX) - tilesX;

    const pushTrick = (anim: string) =>
      sequence.push({ anim, type: TransitionType.Finished, transition: null });

    const pushJumpUp = () =>
      sequence.push({
        anim: `jump-up-${dir}`,
        type: TransitionType.Finished,
        transition: null,
      });

    const pushJumpDown = () =>
      sequence.push({
        anim: `jump-down-${dir}`,
        type: TransitionType.Finished,
        transition: null,
      });

    const pushCruise = (tiles: number) =>
      sequence.push({
        anim: isGoingRight ? "cruise-b-e" : "cruise-f-w",
        type: TransitionType.Distance,
        transition: { dx: dxSign * tileSize * tiles, dy: 0 },
      });

    // Cruise to rail
    pushCruise(tilesToRail);

    // Jump onto rail
    pushJumpUp();
    pushJumpUp();

    if (trickOne !== null)
      pushTrick(isGoingRight ? `${trickOne}-b` : `${trickOne}-f`);

    pushJumpDown();

    // Do grind
    sequence.push({
      anim: `nose-grind-${dir}`,
      type: TransitionType.Distance,
      transition: {
        dx: dxSign * tileSize * tilesGrind,
        dy: 0,
      },
    });

    // Maybe do trick two
    if (trickTwo !== null) {
      pushJumpUp();
      // pushJumpUp();
      pushTrick(isGoingRight ? `${trickTwo}-b` : `${trickTwo}-f`);
      pushJumpDown();
    }

    pushJumpDown();

    pushCruise(tilesAfterRail + diffToEvenTiles);

    sequence.push(
      AnimationSequence.createAnim({
        anim: `flip-${isGoingRight ? "e" : "w"}`,
        type: TransitionType.Finished,
        transition: null,
        options: { overlay: getBoardFlipOverlay(isGoingRight ? "e" : "w") },
      }),
    );

    sequence.push(
      AnimationSequence.createAnim({
        anim: `idle-stand-${isGoingRight ? "e" : "w"}`,
        type: TransitionType.Time,
        transition: { duration: 500 },
        options: {
          overlay: getBoardCarryOverlay(isGoingRight ? "e" : "w", true),
        },
      }),
    );

    return sequence;
  }
}

class BowlObstacle implements SkateUpdatable {
  static TAG: "bowl" = "bowl";
  readonly tag: "bowl" = BowlObstacle.TAG;
  private skater: Skater;
  private timer: Timer;
  private currAction: null | SkateUpdatable;
  private obstacle: Bowl;

  constructor(skater: Skater, obstacle: Bowl, ms: number) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.timer = new Timer();
    this.timer.start(ms);
    this.currAction = null;
    this.obstacle = obstacle;
  }

  init() {}

  update(dt: number): void {
    if (this.currAction === null) {
      this.obstacle.standInLine(this.skater.id);

      this.setSkaterDirection();

      this.currAction = createAction(
        WaitingMyTurn.TAG,
        this.skater,
        this.obstacle,
      );
    } else if (this.currAction.isComplete()) {
      if (this.currAction.tag === WaitingMyTurn.TAG) {
        console.log("WaitingmyTurn is complete");

        // After WaitingMyTurn we got a new idle position assigned to the skater where they should end the round
        snapSkaterToWholeTile(this.skater);
        unoccupySkaterCell(this.skater);
      
        const start = this.obstacle.getClosestTrickStartPos(this.skater.pos);
        this.currAction = createAction(
          BowlTricks.TAG,
          this.skater,
          this.obstacle,
          start,
        );
      } else if (this.currAction.tag === BowlTricks.TAG) {
        console.log("Bowltricsk is complete");
        this.obstacle.endSkate(this.skater.id);
        this.obstacle.standInLine(this.skater.id);

        this.setSkaterDirection();

        this.currAction = createAction(
          WaitingMyTurn.TAG,
          this.skater,
          this.obstacle,
        );
      }
    }

    this.currAction.update(dt);
  }

  isComplete(): boolean {
    return (
      this.timer.isStopped &&
      this.currAction !== null &&
      this.currAction.isComplete()
    );
  }

  private setSkaterDirection() {
    if (this.skater.pos.y <= this.obstacle.pos.y) {
      this.skater.direction = "s";
    } else if (
      this.skater.pos.y >=
      this.obstacle.pos.y + this.obstacle.height
    ) {
      this.skater.direction = "n";
    } else if (this.skater.pos.x > this.obstacle.pos.x) {
      this.skater.direction = "w";
    } else {
      this.skater.direction = "e";
    }
  }
}

class BowlTricks implements SkateUpdatable {
  static TAG: "bowl-tricks" = "bowl-tricks";
  readonly tag: "bowl-tricks" = BowlTricks.TAG;

  private obstacle: Bowl;
  private skater: Skater;
  private animationSequence: AnimationSequence;
  private tileSize: number;

  private start: { pos: Vec2; bowlSide: BowlSide };

  private path: Path | null;
  private step: "start" | "bowl" | "return";
  private returnedToIdleWithoutPath: boolean;

  constructor(
    skater: Skater,
    obstacle: Bowl,
    start: { pos: Vec2; bowlSide: BowlSide },
  ) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.tileSize = this.skater.tileSize;
    this.obstacle = obstacle;

    this.start = start;

    if (!isSamePos(this.skater.pos, this.start.pos)) {
      this.step = "start";
    } else {
      this.step = "bowl";
    }

    this.path = null;
    this.returnedToIdleWithoutPath = false;

    const seq = BowlTricks.TrickSet(this.start.bowlSide, randomInt(1, 10));

    this.animationSequence = new AnimationSequence(this.skater, seq);
  }

  init() {}

  update(dt: number): void {
    const animName = this.skater.animations.getPlaying();
    switch (this.step) {
      case "start": {
        if (this.path === null) {
          this.path = new Path(
            this.skater,
            this.start.pos,
            (this.skater.scene as Play).parkGrid,
            [2],
          );

          this.path.start();
          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlay: getBoardCarryOverlay(this.skater.direction),
          });
        } else if (this.path.hasReachedGoal) {
          this.step = "bowl";

          this.path.finish();
          this.path = null;

          return;
        }

        this.path.update(dt);

        // Change animation if skater changed direction
        if (
          animName === null ||
          !animName.includes(`-${this.skater.direction}`)
        ) {
          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlay: getBoardCarryOverlay(this.skater.direction),
          });
        }

        break;
      }
      case "bowl":
        if (!this.animationSequence.hasStarted()) {
          console.log("STARTING ANIM SEQ for bowl triucks");
          this.animationSequence.start();
        }

        this.animationSequence.update(dt);

        if (this.animationSequence.isFinished) {
          this.step = "return";
        }
        break;
      case "return": {
        if (this.path === null) {
          const currCell = posToCell(this.skater.pos, this.tileSize);

          currCell.col = Math.round(currCell.col);
          currCell.row = Math.round(currCell.row);

          this.skater.pos = cellToPos(currCell, this.tileSize);

          // Block out cells to not pick a cell too close to the bowl's starting positiongs

          const closestCell = findClosestFreeCell(
            currCell,
            (this.skater.scene as Play).getWalkabilityGrid(),
            [2],
          );

          if (closestCell === null) throw Error("WHY");

          const idlePos = cellToPos(closestCell, this.tileSize);
          occupySkaterCell(this.skater, idlePos);

          if (isSamePos(idlePos, this.skater.pos)) {
            this.returnedToIdleWithoutPath = true;
            this.playReturnIdleAnimation();
            break;
          }

          this.path = new Path(
            this.skater,
            idlePos,
            (this.skater.scene as Play).parkGrid,
            [2],
          );

          this.path.start();
          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlay: getBoardCarryOverlay(this.skater.direction),
          });
        }

        this.path.update(dt);

        // Change animation if skater changed direction
        if (
          animName === null ||
          !animName.includes(`-${this.skater.direction}`)
        ) {
          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlay: getBoardCarryOverlay(this.skater.direction),
          });
        }

        if (this.path.hasReachedGoal) {
          this.playReturnIdleAnimation();

          this.path.finish();
        }

        break;
      }
    }
  }

  isComplete(): boolean {
    return (
      this.step === "return" &&
      ((this.path !== null && this.path.hasReachedGoal) ||
        this.returnedToIdleWithoutPath) &&
      (this.skater.animations.getPlaying()?.includes("idle") ?? false)
    );
  }

  private playReturnIdleAnimation(): void {
    if (this.skater.pos.y < this.obstacle.pos.y) {
      this.skater.direction = "s";
      this.skater.animations.play("idle-stand-s", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    } else if (this.skater.pos.y > this.obstacle.pos.y + this.obstacle.height) {
      this.skater.direction = "n";
      this.skater.animations.play("idle-stand-n", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    } else if (this.skater.pos.x > this.obstacle.pos.x) {
      this.skater.direction = "w";
      this.skater.animations.play("idle-stand-w", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    } else {
      this.skater.direction = "e";
      this.skater.animations.play("idle-stand-e", {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    }
  }

  static TrickSet(startSide: BowlSide, numTricks: number): SequenceAnimation[] {
    type Flipside = "f" | "b" | "e" | "w";

    const set: SequenceAnimation[] = [];

    let direction: Direction = bowlSideToStartDir.get(startSide)!;

    let flipside: Flipside = direction === "s" || direction === "n" ? "e" : "f";

    const isHorizontal = direction === "e" || direction === "w";

    const push = (trick: string) => {
      set.push(
        AnimationSequence.createAnim({
          anim: trick,
          type: TransitionType.Finished,
          transition: null,
        }),
      );
    };

    push(
      `cruise-bowl-${isHorizontal ? flipside : direction}-${isHorizontal ? direction : flipside}`,
    );

    for (let i = 0; i < numTricks; ++i) {
      const trick = randomBool() ? randomEl(obstacleTricks.bowl)! : null;

      if (isHorizontal) {
        if (trick === "180") {
          push(`180-${flipside}`);
          flipside = flipside === "f" ? "b" : "f";
        } else if (trick === "360") {
          push(`360-${flipside}`);
        } else if (trick === "grab") {
          push(`grab-${flipside}`);
        }
        direction = direction === "e" ? "w" : "e";
      } else {
        if (trick === "180") {
          push(`180-${flipside}-${flipside === "e" ? "ccw" : "cw"}`);
          flipside = flipside === "e" ? "w" : "e";
        } else if (trick === "360") {
          push(`360-${flipside}-${flipside === "e" ? "ccw" : "cw"}`);
        } else if (trick === "grab") {
          push(`180-${flipside}-${flipside === "e" ? "ccw" : "cw"}`);
        }

        direction = direction === "n" ? "s" : "n";
      }

      push(
        `cruise-bowl-${isHorizontal ? flipside : direction}-${isHorizontal ? direction : flipside}`,
      );
    }

    set.push(
      AnimationSequence.createAnim({
        anim: `flip-${direction}`,
        type: TransitionType.Finished,
        transition: null,
        options: { overlay: getBoardFlipOverlay(direction) },
      }),
    );

    set.push(
      AnimationSequence.createAnim({
        anim: `idle-stand-${direction}`,
        type: TransitionType.Time,
        transition: { duration: 1000 },
        options: { overlay: getBoardCarryOverlay(direction, true) },
      }),
    );

    console.log(set);

    return set;
  }
}

class CruiseTo implements SkateUpdatable {
  static TAG: "cruise-to" = "cruise-to";
  readonly tag: "cruise-to" = CruiseTo.TAG;

  skater: Skater;
  path: Path | null;
  private animSeq: AnimationSequence | null;

  constructor(skater: Skater, to: Vec2) {
    this.skater = skater;
    this.skater.action = this.tag;

    if (isSamePos(this.skater.pos, to)) {
      this.path = null;
    } else {
      this.path = new Path(
        this.skater,
        to,
        (this.skater.scene as Play).parkGrid,
        [2],
      );
      this.path.start();
    }

    if (this.skater.direction === "e") {
      this.skater.animations.play(`cruise-b-${this.skater.direction}`);
    } else if (this.skater.direction === "w") {
      this.skater.animations.play(`cruise-f-${this.skater.direction}`);
    } else {
      this.skater.animations.play(`cruise-${this.skater.direction}`);
    }
    this.animSeq = null;
  }
  init() {}
  update(dt: number): void {
    if (this.path === null || this.path.hasReachedGoal) {
      if (!this.animSeq) {
        this.animSeq = new AnimationSequence(
          this.skater,
          [
            AnimationSequence.createAnim({
              anim: `flip-${this.skater.direction}`,
              type: TransitionType.Finished,
              transition: null,
              options: { overlay: getBoardFlipOverlay(this.skater.direction) },
            }),
            AnimationSequence.createAnim({
              anim: `idle-stand-${this.skater.direction}`,
              type: TransitionType.Time,
              transition: { duration: 1000 },
              options: {
                overlay: getBoardCarryOverlay(this.skater.direction, true),
              },
            }),
          ],
          (anim: string) => {
            console.log(anim);
          },
        );
        this.animSeq.start();
      }

      this.animSeq.update(dt);
      this.path?.finish();
    } else {
      const anim = this.skater.animations.getPlaying();
      if (anim === null || !anim.includes(`-${this.skater.direction}`)) {
        if (this.skater.direction === "e") {
          this.skater.animations.play(`cruise-b-${this.skater.direction}`);
        } else if (this.skater.direction === "w") {
          this.skater.animations.play(`cruise-f-${this.skater.direction}`);
        } else {
          this.skater.animations.play(`cruise-${this.skater.direction}`);
        }
      }

      this.path.update(dt);
    }
  }

  isComplete(): boolean {
    return (
      (this.path === null || this.path.hasReachedGoal) &&
      this.animSeq !== null &&
      this.animSeq.isFinished
    );
  }
}

class WaitingMyTurn implements SkateUpdatable {
  static TAG: "waiting-my-turn" = "waiting-my-turn";
  readonly tag: "waiting-my-turn" = WaitingMyTurn.TAG;
  private skater: Skater;
  private obstacle: Obstacle;
  private timer: Timer;

  constructor(skater: Skater, obstacle: Obstacle) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.obstacle = obstacle;
    this.timer = new Timer();
    this.timer.start(1000 * 3);
  }

  init() {}

  update(_: number): void {
    if (
      !this.skater.animations.isPlaying(`idle-stand-${this.skater.direction}`)
    ) {
      this.skater.animations.play(`idle-stand-${this.skater.direction}`, {
        overlay: getBoardCarryOverlay(this.skater.direction, true),
      });
    }

    if (this.obstacle.isMyTurn(this.skater.id)) {
      this.obstacle.skate(this.skater.id);
    }
  }

  isComplete(): boolean {
    return this.obstacle.isOccupiedByMe(this.skater.id) && this.timer.isStopped;
  }
}

class SittingBench implements SkateUpdatable {
  static TAG: "bench" = "bench";
  readonly tag: "bench" = SittingBench.TAG;
  private skater: Skater;
  private timer: Timer;
  private bench: Bench;

  constructor(skater: Skater, bench: Bench, duration: number) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.bench = bench;
    this.timer = new Timer();
    this.timer.start(duration);
  }
  init() {}

  update(_: number): void {
    if (!this.skater.animations.isPlaying("idle-sit-s")) {
      this.skater.pos.x = this.bench.pos.x;
      this.skater.pos.y = this.bench.pos.y + (this.skater.tileSize / 4) * 3;
      this.skater.direction = "s";
      this.skater.animations.play("idle-sit-s", {
        overlay: {
          name: `board-sit-s`,
          drawOnTop: true,
          drawBehind: false,
          dy: this.skater.tileSize * 0.5 + 2,
          dx: 0,
        },
      });
    }
  }

  isComplete(): boolean {
    return this.timer.isStopped;
  }
}

export interface SkateUpdatable extends Updatable {
  readonly tag: SkatingAtParkActionTag;
}

const spec = {
  "skating-at-park": { ctor: SkatingAtPark },
  "cruise-to": { ctor: CruiseTo },
  bench: { ctor: SittingBench },
  "waiting-my-turn": { ctor: WaitingMyTurn },
  flat: { ctor: FlatObstacle },
  rail: { ctor: RailObstacle },
  bowl: { ctor: BowlObstacle },
  "bowl-tricks": { ctor: BowlTricks },
  "rail-tricks": { ctor: RailTricks },
} as const;

export type SkateActionSpec = {
  [K in keyof typeof spec]: {
    args: ConstructorParameters<(typeof spec)[K]["ctor"]>;
    result: InstanceType<(typeof spec)[K]["ctor"]>;
  };
};

export type SkatingAtParkActionTag = keyof SkateActionSpec;

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor]),
) as { [K in SkatingAtParkActionTag]: (typeof spec)[K]["ctor"] };
