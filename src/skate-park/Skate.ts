import type Play from "../Play.ts";
import Skater from "./Skater.ts";
import {
  randomBool,
  randomEl,
  randomInt,
  posToTile,
  isSamePos,
} from "../lib/index.ts";
import { Path } from "../lib/index.ts";
import Timer, { ONE_MINUTE, ONE_SECOND, TEN_SECONDS } from "../Timer.ts";
import Obstacle, {
  obstacles,
  obstacleTricks,
  tricks,
  BowlSide,
  Rail,
  RailSide,
  Bowl,
  bowlSideToStartDir,
  type Trick,
  type ObstacleType,
} from "./Obstacle.ts";
import { TransitionType, type SequenceAnimation } from "../lib/index.ts";
import { AnimationSequence, type Direction, type Vec2 } from "../lib/index.ts";
import { getBoardCarryOverlay, getBoardFlipOverlay } from "./Skater.ts";
import type Bench from "../Bench.ts";
import { createAction, type Updatable } from "../actions.ts";
import { GroundArea } from "../lib/Grid.ts";
import {
  SitOnGrass,
  type CommonActionSpec,
  type CommonUpdatable,
} from "../commonActions.ts";
import VendingMachine from "../VendingMachine.ts";

enum CruiseGoal {
  OBSTACLE,
  BENCH,
  GRASS,
  VENDING_MACHINE,
}

export default class Skate implements SkateUpdatable {
  static TAG: "skate" = "skate";
  readonly tag: "skate" = Skate.TAG;

  private skater: Skater;
  private tricks: Trick[];
  private obstacles: ObstacleType[];
  private currAction: SkateUpdatable | CommonUpdatable | null;
  private obstacle: Obstacle | null;
  private bench: Bench | null;
  private vendingMachine: VendingMachine | null;
  private play: Play;
  private cruiseGoal: CruiseGoal | null;
  private initAction: SkateActionTag;

  constructor(skater: Skater, initAction: SkateActionTag) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.tricks = tricks.slice(0, skater.skill - 1);
    this.obstacles = obstacles.filter((o) =>
      obstacleTricks[o].some((t1) => this.tricks.includes(t1)),
    );
    this.initAction = initAction;
    this.currAction = null;
    this.obstacle = null;
    this.bench = null;
    this.play = this.skater.scene as Play;
    this.cruiseGoal = null;
    this.vendingMachine = null;
  }

  init() {
    switch (this.initAction) {
      case SitOnBench.TAG: {
        if (!this.play.skateGround.hasFreeBenches())
          throw Error("Invalid initial state, not enough free benches");
        if (!this.play.skateGround.hasFreeVendingMachines())
          throw Error("Invalid initial state, not enough free benches");

        const bench = this.play.skateGround.getFreeBench();

        this.bench = bench;

        const vendingMachine = this.play.skateGround.getFreeVendingMachine();
        this.vendingMachine = vendingMachine;

        this.skater.pos.x = vendingMachine.pos.x;
        this.skater.pos.y = vendingMachine.pos.y + this.bench.height;

        this.transitionToAction(VendingMachineShopping.TAG, this.skater);

        break;
      }
      case RailObstacle.TAG: {
        this.obstacle = this.play.skateGround.getObstacle("rail");

        this.obstacle.arrive(this.skater.id);

        this.skater.pos = {
          ...this.obstacle!.getArrivePos(this.skater.pos, this.play.grid),
        };

        this.play.grid.occupyTile(this.skater.id, this.skater.pos);

        this.transitionToAction(
          this.obstacle.type,
          this.skater,
          this.obstacle as Rail,
          TEN_SECONDS,
        );

        break;
      }
      case BowlObstacle.TAG: {
        this.obstacle = this.play.skateGround.getObstacle("bowl");
        this.obstacle.arrive(this.skater.id);
        const pos = this.obstacle.getArrivePos(this.skater.pos, this.play.grid);

        this.skater.pos = { ...pos };

        this.play.grid.occupyTile(this.skater.id, this.skater.pos);

        this.transitionToAction(
          this.obstacle.type,
          this.skater,
          this.obstacle as Bowl,
          TEN_SECONDS,
        );

        break;
      }
      case FlatObstacle.TAG:
        this.obstacle = this.play.skateGround.getObstacle("flat");

        this.obstacle.arrive(this.skater.id);

        this.skater.pos = {
          ...this.obstacle!.getArrivePos(this.skater.pos, this.play.grid),
        };
        this.play.grid.occupyTile(this.skater.id, this.skater.pos);
        this.transitionToAction(
          this.obstacle.type,
          this.skater,
          this.obstacle as Obstacle,
          TEN_SECONDS,
        );

        break;
    }
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${this.tag} uninitialized`);

    this.currAction.update(dt);

    switch (this.currAction.tag) {
      case CruiseTo.TAG:
        if (this.currAction.isComplete()) {
          if (this.cruiseGoal === null) throw new Error("No cruise goal set!");

          switch (this.cruiseGoal) {
            case CruiseGoal.OBSTACLE:
              if (this.obstacle === null)
                throw new Error(
                  `Invalid state  ${this.tag} error: obstacle is null`,
                );
              this.skater.obstacle = this.obstacle.id;

              switch (this.obstacle.type) {
                case RailObstacle.TAG:
                  this.transitionToAction(
                    this.obstacle.type,
                    this.skater,
                    this.obstacle as Rail,
                    TEN_SECONDS,
                  );
                  break;
                case BowlObstacle.TAG:
                  this.transitionToAction(
                    this.obstacle.type,
                    this.skater,
                    this.obstacle as Bowl,
                    TEN_SECONDS,
                  );
                  break;
                case FlatObstacle.TAG:
                  this.transitionToAction(
                    this.obstacle.type,
                    this.skater,
                    this.obstacle as Obstacle,
                    TEN_SECONDS,
                  );
                  break;
              }
              break;
            case CruiseGoal.VENDING_MACHINE:
              if (this.bench === null)
                throw new Error(
                  `Invalid state  ${this.tag} error: bench is null`,
                );
              if (this.vendingMachine === null)
                throw new Error(
                  `Invalid state  ${this.tag} error: vending machine is null`,
                );
              this.transitionToAction(VendingMachineShopping.TAG, this.skater);
              break;
            case CruiseGoal.BENCH:
              if (this.bench === null)
                throw new Error(
                  `Invalid state  ${this.tag} error: bench is null`,
                );
              this.skater.bench = this.bench.id;

              this.transitionToAction(
                SitOnBench.TAG,
                this.skater,
                this.bench,
                TEN_SECONDS,
                true,
              );
              break;
            case CruiseGoal.GRASS:
              if (!this.play.skateGround.isValidGrassIdlePos(this.skater.pos))
                throw new Error(
                  `Invalid state ${this.tag} error: invalid idle grass pos`,
                );
              this.transitionToAction(
                SitOnGrass.TAG,
                this.skater,
                "w",
                TEN_SECONDS,
              );

              break;
          }
        }
        break;
      case FlatObstacle.TAG:
      case RailObstacle.TAG:
      case BowlObstacle.TAG:
        if (this.obstacle === null)
          throw new Error(`Invalid state ${this.tag}: obstacle is null`);

        if (this.currAction.isComplete()) {
          this.obstacle.leave(this.skater.id);

          const currObstacleType = this.obstacle.type;

          this.obstacle = null;

          const obstacle = this.play.skateGround.getFreeObstacle(
            this.obstacles,
            currObstacleType,
          );

          const wantToSkate = randomBool();

          if (
            obstacle !== null &&
            (wantToSkate || !this.play.skateGround.hasFreeBenches())
          ) {
            this.cruiseToObstacle(obstacle);
          } else {
            if (this.play.skateGround.hasFreeBenches()) {
              const bench = this.play.skateGround.getFreeBench();

              const wantToBuySomething = true;

              if (wantToBuySomething) {
                this.cruiseToVendingMachine(
                  bench,
                  this.play.skateGround.getFreeVendingMachine(),
                );
              } else {
                this.cruiseToSitOnBench(bench);
              }
            } else {
              const pos = this.play.skateGround.getGrassIdlePos();
              this.cruiseGoal = CruiseGoal.GRASS;
              this.transitionToAction(CruiseTo.TAG, this.skater, pos, [
                GroundArea.SKATE_GROUND,
                GroundArea.GRASS,
              ]);
            }
          }
        }
        break;
      case VendingMachineShopping.TAG:
        if (this.bench === null)
          throw new Error(`Invalid state ${this.tag}: bench is null`);
        if (this.vendingMachine === null)
          throw new Error(`Invalid state ${this.tag}: vending machine is null`);
        if (this.currAction.isComplete()) {
          this.play.skateGround.returnVendingMachine(this.vendingMachine);
          this.vendingMachine = null;
          this.cruiseToSitOnBench(this.bench);
        }
        break;
      case SitOnBench.TAG:
        if (this.bench === null)
          throw new Error(`Invalid state ${this.tag}: bench is null`);
        if (this.currAction.isComplete()) {
          this.play.skateGround.returnBench(this.bench);

          this.bench = null;

          const obstacle = this.play.skateGround.getFreeObstacle(
            this.obstacles,
          );

          if (obstacle !== null) {
            this.cruiseToObstacle(obstacle);
          } else {
            const pos = this.play.skateGround.getGrassIdlePos();
            this.cruiseGoal = CruiseGoal.GRASS;
            this.transitionToAction(CruiseTo.TAG, this.skater, pos, [
              GroundArea.SKATE_GROUND,
              GroundArea.GRASS,
            ]);
          }
        }
        break;
      case SitOnGrass.TAG:
        if (this.currAction.isComplete()) {
          this.obstacle = null;

          const obstacle = this.play.skateGround.getFreeObstacle(
            this.obstacles,
          );

          const wantToSkate = randomBool();

          if (
            obstacle !== null &&
            (wantToSkate || !this.play.skateGround.hasFreeBenches())
          ) {
            this.cruiseToObstacle(obstacle, [
              GroundArea.SKATE_GROUND,
              GroundArea.GRASS,
            ]);
          } else {
            if (this.play.skateGround.hasFreeBenches()) {
              const bench = this.play.skateGround.getFreeBench();

              this.cruiseToSitOnBench(bench, [
                GroundArea.SKATE_GROUND,
                GroundArea.GRASS,
              ]);
            } else {
              const pos = this.play.skateGround.getGrassIdlePos();
              this.cruiseGoal = CruiseGoal.GRASS;
              this.transitionToAction(CruiseTo.TAG, this.skater, pos, [
                GroundArea.SKATE_GROUND,
                GroundArea.GRASS,
              ]);
            }
          }
        }
        break;
    }
  }

  isComplete(): boolean {
    return false;
  }

  private cruiseToVendingMachine(
    bench: Bench,
    vendingMachine: VendingMachine,
    walkableTiles?: GroundArea[],
  ): void {
    this.bench = bench;
    this.vendingMachine = vendingMachine;

    const inFrontOfPos = {
      x: vendingMachine.pos.x,
      y: vendingMachine.pos.y + this.bench.height,
    };

    if (
      this.play.grid.isTileOccupied(posToTile(inFrontOfPos, this.play.tileSize))
    ) {
      // Should not happen since 1 skater is moving at a time and no skater will stand below this place otherwise
      throw new Error("Position in front of vending machine is occupied");
    }

    this.cruiseGoal = CruiseGoal.VENDING_MACHINE;

    this.transitionToAction(
      CruiseTo.TAG,
      this.skater,
      inFrontOfPos,
      walkableTiles,
    );
  }

  private cruiseToSitOnBench(bench: Bench, walkableTiles?: GroundArea[]): void {
    // console.log("CRUISE TO BENCH?");
    this.bench = bench;

    if (
      this.play.grid.isTileOccupied(
        posToTile(
          {
            x: this.bench.pos.x,
            y: this.bench.pos.y + this.bench.height,
          },
          this.play.tileSize,
        ),
      )
    ) {
      // Should not happen since 1 skater is moving at a time and no skater who is doing tricks will stand below the bench.
      throw new Error("Position below bench is occupied");
    }
    this.cruiseGoal = CruiseGoal.BENCH;
    const frontOfBenchPos = {
      x: this.bench.pos.x,
      y: this.bench.pos.y + this.bench.height,
    };

    this.transitionToAction(
      CruiseTo.TAG,
      this.skater,
      frontOfBenchPos,
      walkableTiles,
    );
  }

  private cruiseToObstacle(
    obstacle: Obstacle,
    walkableTiles?: GroundArea[],
  ): void {
    this.obstacle = obstacle;
    this.obstacle!.arrive(this.skater.id);
    const arrivePos = this.obstacle!.getArrivePos(
      this.skater.pos,
      this.play.grid,
    );

    this.cruiseGoal = CruiseGoal.OBSTACLE;

    this.transitionToAction(
      CruiseTo.TAG,
      this.skater,
      arrivePos,
      walkableTiles,
    );
  }

  private transitionToAction<
    A extends keyof (SkateActionSpec & CommonActionSpec),
  >(tag: A, ...args: (SkateActionSpec & CommonActionSpec)[A]["args"]) {
    if (tag === CruiseTo.TAG) {
      console.log(`
        Cruising from action ${this.currAction!.tag} 
        and pos ${this.skater.pos.x} ${this.skater.pos.y} to Cruise goal: ${this.cruiseGoal}, ${this.skater.animations.getPlaying()}`);
    }

    this.currAction = createAction(tag, ...args);
    this.currAction!.init();
  }
}

export class RailObstacle implements SkateUpdatable {
  static TAG: "rail" = "rail";
  readonly tag: "rail" = RailObstacle.TAG;

  private skater: Skater;
  private timer: Timer;
  private currAction: null | SkateUpdatable;
  private obstacle: Rail;
  private play: Play;
  private isReadyToCruise: boolean;

  constructor(skater: Skater, obstacle: Rail, ms: number) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.timer = new Timer();
    this.timer.start(ms);
    this.currAction = null;
    this.obstacle = obstacle;
    this.play = this.skater.scene as Play;
    this.isReadyToCruise = false;
  }

  init(): void {
    if (this.skater.pos.y <= this.obstacle.pos.y) {
      this.skater.direction = "s";
      this.skater.animations.play("idle-stand-s", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    } else {
      this.skater.direction = "n";
      this.skater.animations.play("idle-stand-n", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    }

    this.transitionToAction(WaitingMyTurn.TAG, this.skater, this.obstacle);
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State uninitialized ${this.tag}`);

    this.timer.update(dt);

    this.currAction.update(dt);

    switch (this.currAction.tag) {
      case WaitingMyTurn.TAG:
        if (this.currAction.isComplete()) {
          const start = this.obstacle.getClosestTrickStartPos(this.skater.pos);

          this.transitionToAction(
            RailTricks.TAG,
            this.skater,
            this.obstacle,
            start,
          );
        }
        break;

      case RailTricks.TAG:
        if (this.currAction.isComplete()) {
          this.obstacle.endSkate(this.skater.id);

          // Check if we should end this state! obs the skater has to be on an idle pos above the rail to be able to find a path from there!
          if (
            !this.timer.isRunning &&
            this.skater.pos.y < this.obstacle.pos.y &&
            !this.play.skateGround.isSkateGroundBlocked() &&
            this.obstacle.getNumSkaters() > 2
          ) {
            this.timer.stop();
            this.play.skateGround.blockSkateGround(this.skater.id);
            this.isReadyToCruise = true;
            return;
          }

          this.transitionToAction(
            WaitingMyTurn.TAG,
            this.skater,
            this.obstacle,
          );
        }

        break;
    }
  }

  isComplete(): boolean {
    return this.isReadyToCruise;
  }

  private transitionToAction<A extends keyof SkateActionSpec>(
    tag: A,
    ...args: SkateActionSpec[A]["args"]
  ) {
    this.currAction = createAction(tag, ...args);
    this.currAction!.init();
  }
}

export class FlatObstacle implements SkateUpdatable {
  static TAG: "flat" = "flat";
  readonly tag: "flat" = FlatObstacle.TAG;
  private skater: Skater;
  private animationSeq: AnimationSequence | null;
  private timer: Timer;
  private play: Play;
  private isReadyToCruise: boolean;

  constructor(skater: Skater, obstacle: Obstacle, ms: number) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.skater.direction = "s";
    this.play = this.skater.scene as Play;
    this.animationSeq = new AnimationSequence(
      this.skater,
      FlatObstacle.CreateAnimationSequence(this.skater.direction),
    );
    this.timer = new Timer();
    this.timer.start(ms);
    this.isReadyToCruise = false;
    this.animationSeq.start();
  }

  init() {}

  update(dt: number) {
    if (this.animationSeq === null)
      throw new Error("Animation sequence for Flat obstacle is null");

    this.animationSeq.update(dt);
    this.timer.update(dt);

    if (this.animationSeq.isFinished) {
      this.animationSeq.finish();
      this.animationSeq = null;

      if (
        !this.timer.isRunning &&
        !this.play.skateGround.isSkateGroundBlocked()
      ) {
        this.timer.stop();
        this.play.skateGround.blockSkateGround(this.skater.id);
        this.isReadyToCruise = true;
        return;
      }

      this.animationSeq = new AnimationSequence(
        this.skater,
        FlatObstacle.CreateAnimationSequence(this.skater.direction),
      );

      this.animationSeq.start();
    }
  }

  isComplete(): boolean {
    return this.isReadyToCruise;
  }

  static CreateAnimationSequence(direction: Direction): SequenceAnimation[] {
    const trick = randomEl(obstacleTricks["flat"])!;

    const flipside = "f";

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
        anim: `${trick.includes("shove-it") ? "shove-it" : trick}-${flipside}`,
        type: TransitionType.Finished,
        transition: null,
      }),
    ];

    return seq;
  }
}

enum RailTricksStep {
  APPROACH_START,
  RAIL,
  GO_BACK,
  RETURNED,
}

class RailTricks implements SkateUpdatable {
  static TAG: "rail-tricks" = "rail-tricks";
  readonly tag: "rail-tricks" = RailTricks.TAG;

  private play: Play;
  private obstacle: Rail;
  private skater: Skater;
  private animationSequence: AnimationSequence;
  private tileSize: number;
  private path: Path | null;

  private step: RailTricksStep;
  private startPos: { pos: Vec2; railSide: RailSide };

  constructor(
    skater: Skater,
    obstacle: Rail,
    start: { pos: Vec2; railSide: RailSide },
  ) {
    this.skater = skater;
    this.play = this.skater.scene as Play;
    this.skater.action = this.tag;
    this.tileSize = this.skater.tileSize;
    this.obstacle = obstacle;
    this.play = this.skater.scene as Play;
    this.path = null;

    this.step = RailTricksStep.APPROACH_START;
    this.startPos = start;

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
      startSide: this.startPos.railSide,
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
      // (anim) => {
      //   // console.log(anim);
      //   // console.log("Skater X ", this.skater.pos.x);
      // },
    );
  }

  init() {
    this.path = new Path(this.skater, this.startPos.pos, [
      GroundArea.SKATE_GROUND,
      GroundArea.TRICK_GROUND,
    ]);
    this.path.start();
    if (
      !this.skater.animations.isPlaying(`walk-board-${this.skater.direction}`)
    ) {
      this.skater.animations.play(`walk-board-${this.skater.direction}`, {
        overlays: [getBoardCarryOverlay(this.skater.direction)],
      });
    }
  }

  update(dt: number): void {
    switch (this.step) {
      case RailTricksStep.APPROACH_START: {
        if (this.path === null)
          throw new Error(`State ${this.tag} uninitialized`);

        this.path.update(dt);

        if (
          !this.skater.animations.isPlaying(
            `walk-board-${this.skater.direction}`,
          )
        ) {
          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlays: [getBoardCarryOverlay(this.skater.direction)],
          });
        }

        if (this.path.hasReachedGoal) {
          this.path.finish();
          this.path = null;
          this.step = RailTricksStep.RAIL;
        }

        break;
      }
      case RailTricksStep.RAIL: {
        if (!this.animationSequence.hasStarted()) {
          // Path has occupied the last tile the skater stood so we have to unoccupy it when the trick sequence start
          this.skater.scene.grid.unoccupyTile(this.skater.id, this.skater.pos);

          this.skater.direction =
            this.startPos.railSide === RailSide.LEFT ? "e" : "w";
          this.animationSequence.start();
        }

        this.animationSequence.update(dt);

        if (this.animationSequence.isFinished) {
          this.animationSequence.finish();
          this.step = RailTricksStep.GO_BACK;
        }

        break;
      }
      case RailTricksStep.GO_BACK: {
        if (this.path === null) {
          // Blocking the skateground before returning to the idle pos to prevent deadlocks with cruising skaters
          if (this.play.skateGround.isSkateGroundBlocked()) return;
          this.play.skateGround.blockSkateGround(this.skater.id);
          const idlePos = this.obstacle.getArrivePos(
            this.skater.pos,
            this.play.grid,
          );

          this.path = new Path(this.skater, idlePos, [
            GroundArea.SKATE_GROUND,
            GroundArea.TRICK_GROUND,
          ]);

          this.path.start();

          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlays: [getBoardCarryOverlay(this.skater.direction)],
          });
        } else if (this.path.hasReachedGoal) {
          this.play.skateGround.unblockSkateGround(this.skater.id);
          this.playReturnIdleAnimation();
          this.path.finish();
          this.path = null;
          this.step = RailTricksStep.RETURNED;
        } else {
          if (
            !this.skater.animations.isPlaying(
              `walk-board-${this.skater.direction}`,
            )
          ) {
            this.skater.animations.play(`walk-board-${this.skater.direction}`, {
              overlays: [getBoardCarryOverlay(this.skater.direction)],
            });
          }
          this.path.update(dt);
        }

        break;
      }
    }
  }

  isComplete(): boolean {
    return this.step === RailTricksStep.RETURNED;
  }

  private playReturnIdleAnimation(): void {
    if (this.skater.pos.y < this.obstacle.pos.y) {
      this.skater.direction = "s";
      this.skater.animations.play("idle-stand-s", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    } else if (this.skater.pos.y > this.obstacle.pos.y + this.obstacle.height) {
      this.skater.direction = "n";
      this.skater.animations.play("idle-stand-n", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    } else if (this.skater.pos.x > this.obstacle.pos.x) {
      this.skater.direction = "w";
      this.skater.animations.play("idle-stand-w", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    } else {
      this.skater.direction = "e";
      this.skater.animations.play("idle-stand-e", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
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
        options: { overlays: [getBoardFlipOverlay(isGoingRight ? "e" : "w")] },
      }),
    );

    sequence.push(
      AnimationSequence.createAnim({
        anim: `idle-stand-${isGoingRight ? "e" : "w"}`,
        type: TransitionType.Time,
        transition: { duration: 500 },
        options: {
          overlays: [getBoardCarryOverlay(isGoingRight ? "e" : "w", true)],
        },
      }),
    );

    return sequence;
  }
}

export class BowlObstacle implements SkateUpdatable {
  static TAG: "bowl" = "bowl";
  readonly tag: "bowl" = BowlObstacle.TAG;
  private skater: Skater;
  private timer: Timer;
  private currAction: null | SkateUpdatable;
  private obstacle: Bowl;
  private play: Play;
  private isReadyToCruise: boolean;

  constructor(skater: Skater, obstacle: Bowl, ms: number) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.timer = new Timer();
    this.timer.start(ms);
    this.currAction = null;
    this.obstacle = obstacle;
    this.play = this.skater.scene as Play;
    this.isReadyToCruise = false;
  }

  init() {
    this.setSkaterDirection();
    this.transitionToAction(WaitingMyTurn.TAG, this.skater, this.obstacle);
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${this.tag} is uninitialized`);
    this.timer.update(dt);
    this.currAction.update(dt);

    switch (this.currAction.tag) {
      case WaitingMyTurn.TAG:
        if (this.currAction.isComplete()) {
          const start = this.obstacle.getClosestTrickStartPos(this.skater.pos);
          this.transitionToAction(
            BowlTricks.TAG,
            this.skater,
            this.obstacle,
            start,
          );
        }
        break;

      case BowlTricks.TAG:
        if (this.currAction.isComplete()) {
          this.obstacle.endSkate(this.skater.id);
          if (
            !this.timer.isRunning &&
            !this.play.skateGround.isSkateGroundBlocked() &&
            this.obstacle.getNumSkaters() > 2
          ) {
            this.timer.stop();
            this.play.skateGround.blockSkateGround(this.skater.id);

            this.isReadyToCruise = true;
            return;
          }

          this.setSkaterDirection();
          this.transitionToAction(
            WaitingMyTurn.TAG,
            this.skater,
            this.obstacle,
          );
        }

        break;
    }
  }

  isComplete(): boolean {
    return this.isReadyToCruise;
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

  private transitionToAction<A extends keyof SkateActionSpec>(
    tag: A,
    ...args: SkateActionSpec[A]["args"]
  ) {
    this.currAction = createAction(tag, ...args);
    this.currAction!.init();
  }
}

enum BowlTricksStep {
  APPROACH_START,
  BOWL,
  GO_BACK,
  RETURNED,
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
  private step: BowlTricksStep;
  private play: Play;

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
    this.play = this.skater.scene as Play;
    this.step = BowlTricksStep.APPROACH_START;

    this.path = null;

    const seq = BowlTricks.TrickSet(this.start.bowlSide, randomInt(1, 10));

    this.animationSequence = new AnimationSequence(this.skater, seq);
  }

  init() {
    this.step = BowlTricksStep.APPROACH_START;

    this.path = new Path(this.skater, this.start.pos, [
      GroundArea.SKATE_GROUND,
      GroundArea.TRICK_GROUND,
    ]);

    this.path.start();

    if (
      !this.skater.animations.isPlaying(`walk-board-${this.skater.direction}`)
    ) {
      this.skater.animations.play(`walk-board-${this.skater.direction}`, {
        overlays: [getBoardCarryOverlay(this.skater.direction)],
      });
    }
  }

  update(dt: number): void {
    switch (this.step) {
      case BowlTricksStep.APPROACH_START: {
        if (this.path === null)
          throw new Error(`State ${this.tag} uninitialized`);

        this.path.update(dt);
        if (
          !this.skater.animations.isPlaying(
            `walk-board-${this.skater.direction}`,
          )
        ) {
          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlays: [getBoardCarryOverlay(this.skater.direction)],
          });
        }

        if (this.path.hasReachedGoal) {
          this.step = BowlTricksStep.BOWL;
          this.path.finish();
          this.path = null;

          return;
        }

        break;
      }
      case BowlTricksStep.BOWL:
        if (!this.animationSequence.hasStarted()) {
          this.skater.scene.grid.unoccupyTile(this.skater.id, this.skater.pos);
          this.animationSequence.start();
        }

        this.animationSequence.update(dt);

        if (this.animationSequence.isFinished) {
          this.animationSequence.finish();
          this.step = BowlTricksStep.GO_BACK;
        }

        break;
      case BowlTricksStep.GO_BACK: {
        if (this.path === null) {
          // Blocking the skateground before returning to the idle pos to prevent deadlocks with cruising skaters
          if (this.play.skateGround.isSkateGroundBlocked()) return;

          this.play.skateGround.blockSkateGround(this.skater.id);

          const idlePos = this.obstacle.getArrivePos(
            this.skater.pos,
            this.skater.scene.grid,
          );

          this.path = new Path(this.skater, idlePos, [
            GroundArea.SKATE_GROUND,
            GroundArea.TRICK_GROUND,
          ]);

          this.path.start();

          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlays: [getBoardCarryOverlay(this.skater.direction)],
          });
          return;
        }

        if (this.path.hasReachedGoal) {
          this.playReturnIdleAnimation();
          this.path.finish();
          this.play.skateGround.unblockSkateGround(this.skater.id);
          this.step = BowlTricksStep.RETURNED;

          return;
        }

        this.path.update(dt);

        if (
          !this.skater.animations.isPlaying(
            `walk-board-${this.skater.direction}`,
          )
        ) {
          this.skater.animations.play(`walk-board-${this.skater.direction}`, {
            overlays: [getBoardCarryOverlay(this.skater.direction)],
          });
        }

        break;
      }
    }
  }

  isComplete(): boolean {
    return this.step === BowlTricksStep.RETURNED;
  }

  private playReturnIdleAnimation(): void {
    if (this.skater.pos.y < this.obstacle.pos.y) {
      this.skater.direction = "s";
      this.skater.animations.play("idle-stand-s", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    } else if (this.skater.pos.y > this.obstacle.pos.y + this.obstacle.height) {
      this.skater.direction = "n";
      this.skater.animations.play("idle-stand-n", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    } else if (this.skater.pos.x > this.obstacle.pos.x) {
      this.skater.direction = "w";
      this.skater.animations.play("idle-stand-w", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    } else {
      this.skater.direction = "e";
      this.skater.animations.play("idle-stand-e", {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
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
        options: { overlays: [getBoardFlipOverlay(direction)] },
      }),
    );

    set.push(
      AnimationSequence.createAnim({
        anim: `idle-stand-${direction}`,
        type: TransitionType.Time,
        transition: { duration: 1000 },
        options: { overlays: [getBoardCarryOverlay(direction, true)] },
      }),
    );

    return set;
  }
}

class CruiseTo implements SkateUpdatable {
  static TAG: "cruise-to" = "cruise-to";
  readonly tag: "cruise-to" = CruiseTo.TAG;

  skater: Skater;
  path: Path | null;
  private animSeq: AnimationSequence | null;
  private play: Play;
  private walkableTiles: GroundArea[];

  constructor(skater: Skater, to: Vec2, walkableTiles?: GroundArea[]) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.play = this.skater.scene as Play;
    this.walkableTiles = walkableTiles ?? [GroundArea.SKATE_GROUND];

    if (isSamePos(this.skater.pos, to)) {
      this.path = null;
      this.animSeq = new AnimationSequence(
        this.skater,
        [
          AnimationSequence.createAnim({
            anim: `flip-${this.skater.direction}`,
            type: TransitionType.Finished,
            transition: null,
            options: { overlays: [getBoardFlipOverlay(this.skater.direction)] },
          }),
          AnimationSequence.createAnim({
            anim: `idle-stand-${this.skater.direction}`,
            type: TransitionType.Time,
            transition: { duration: 1000 },
            options: {
              overlays: [getBoardCarryOverlay(this.skater.direction, true)],
            },
          }),
        ],
        (anim: string) => {
          // console.log(anim);
        },
      );

      this.animSeq.start();
    } else {
      this.animSeq = null;

      try {
        this.path = new Path(this.skater, to, this.walkableTiles);

        this.path.start();
      } catch (e) {
        console.log(e);
        console.log("FAILED TO CREATE PATH FROM CRUISE TO!");

        console.dir(this.skater.scene.grid.getGrid());
        throw e;
      }

      if (this.skater.direction === "e") {
        this.skater.animations.play(`cruise-b-${this.skater.direction}`);
      } else if (this.skater.direction === "w") {
        this.skater.animations.play(`cruise-f-${this.skater.direction}`);
      } else {
        this.skater.animations.play(`cruise-${this.skater.direction}`);
      }
    }
  }

  init() {}

  update(dt: number): void {
    if (this.animSeq !== null) {
      this.animSeq.update(dt);

      if (this.animSeq.isFinished) {
        this.animSeq.finish();
        this.animSeq = null;
        this.play.skateGround.unblockSkateGround(this.skater.id);
      }
      return;
    }

    if (this.path !== null) {
      this.path.update(dt);
      if (this.path.hasReachedGoal) {
        this.path.finish();
        this.path = null;

        this.animSeq = new AnimationSequence(
          this.skater,
          [
            AnimationSequence.createAnim({
              anim: `flip-${this.skater.direction}`,
              type: TransitionType.Finished,
              transition: null,
              options: {
                overlays: [getBoardFlipOverlay(this.skater.direction)],
              },
            }),
            AnimationSequence.createAnim({
              anim: `idle-stand-${this.skater.direction}`,
              type: TransitionType.Time,
              transition: { duration: 1000 },
              options: {
                overlays: [getBoardCarryOverlay(this.skater.direction, true)],
              },
            }),
          ],
          (anim: string) => {
            // console.log(anim);
          },
        );

        this.animSeq.start();

        return;
      }

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
    }
  }

  isComplete(): boolean {
    return !this.play.skateGround.isBlockingSkateGround(this.skater.id);
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
    this.timer.start(ONE_SECOND);
  }

  init() {
    this.obstacle.standInLine(this.skater.id);
  }

  update(dt: number): void {
    if (
      !this.skater.animations.isPlaying(`idle-stand-${this.skater.direction}`)
    ) {
      this.skater.animations.play(`idle-stand-${this.skater.direction}`, {
        overlays: [getBoardCarryOverlay(this.skater.direction, true)],
      });
    }

    this.timer.update(dt);

    if (this.obstacle.isMyTurn(this.skater.id) && !this.timer.isRunning) {
      this.obstacle.skate(this.skater.id);
      this.timer.stop();
    }
  }

  isComplete(): boolean {
    return this.obstacle.isOccupiedByMe(this.skater.id);
  }
}

export class VendingMachineShopping implements SkateUpdatable {
  static TAG: "vending-machine-shopping" = "vending-machine-shopping";
  readonly tag: "vending-machine-shopping" = VendingMachineShopping.TAG;
  private skater: Skater;
  private play: Play;
  private timer: Timer;
  private isReadyToCruise: boolean;

  private animSeqApproach: AnimationSequence | null;
  private animSeqGoBack: AnimationSequence | null;

  constructor(skater: Skater) {
    this.skater = skater;
    this.skater.action = this.tag;
    this.timer = new Timer();
    this.play = this.skater.scene as Play;
    this.isReadyToCruise = false;

    this.animSeqApproach = new AnimationSequence(this.skater, [
      {
        anim: "walk-board-n",
        type: TransitionType.Distance,
        transition: { dx: 0, dy: -this.skater.tileSize * 0.5 },
        options: {
          overlays: [getBoardCarryOverlay("n")],
        },
      },
    ]);

    this.animSeqGoBack = new AnimationSequence(this.skater, [
      {
        anim: "walk-board-s",
        type: TransitionType.Distance,
        transition: { dx: 0, dy: this.skater.tileSize * 0.5 },
        options: {
          overlays: [getBoardCarryOverlay("s")],
        },
      },
    ]);
  }

  init() {
    this.skater.direction = "n";
    this.animSeqApproach!.start();
  }

  update(dt: number): void {
    if (this.timer !== null) this.timer.update(dt);

    if (this.animSeqGoBack !== null && this.animSeqGoBack.hasStarted()) {
      this.animSeqGoBack.update(dt);

      if (this.animSeqGoBack.isFinished) {
        this.skater.animations.play("idle-stand-s", {
          overlays: [getBoardCarryOverlay(this.skater.direction, true)],
        });
        this.animSeqGoBack.finish();
        this.animSeqGoBack = null;
        this.isReadyToCruise = true;
      }

      return;
    }

    if (this.animSeqApproach !== null && this.animSeqApproach.hasStarted()) {
      this.animSeqApproach.update(dt);
      if (this.animSeqApproach.isFinished) {
        this.skater.direction = "n";
        this.skater.animations.play("idle-stand-n", {
          overlays: [getBoardCarryOverlay(this.skater.direction, true)],
        });
        this.animSeqApproach.finish();
        this.animSeqApproach = null;
        this.timer.start(TEN_SECONDS);
      }
      return;
    }

    if (
      !this.timer.isRunning &&
      !this.play.skateGround.isSkateGroundBlocked()
    ) {
      this.skater.direction = "s";
      this.animSeqGoBack!.start();
      this.timer.stop();
      this.play.skateGround.blockSkateGround(this.skater.id);
      return;
    }
  }

  isComplete(): boolean {
    return this.isReadyToCruise === true;
  }
}

export class SitOnBench implements SkateUpdatable {
  static TAG: "bench" = "bench";
  readonly tag: "bench" = SitOnBench.TAG;
  private skater: Skater;
  private timer: Timer | null;
  private duration: number | null;
  private bench: Bench;
  private animSeqSitDown: AnimationSequence | null;
  private animSeqStandUp: AnimationSequence | null;
  private play: Play;
  private isReadyToCruise: boolean;
  private isDrinking: boolean;

  constructor(
    human: Skater,
    bench: Bench,
    duration: number | null = null,
    isDrinking: boolean = false,
  ) {
    this.skater = human;
    this.skater.action = this.tag;
    this.duration = duration;
    this.bench = bench;
    this.timer = new Timer();
    this.play = this.skater.scene as Play;
    this.isReadyToCruise = false;
    this.isDrinking = isDrinking;
    this.animSeqSitDown = new AnimationSequence(this.skater, [
      {
        anim: "walk-board-n",
        type: TransitionType.Distance,
        transition: { dx: 0, dy: -this.skater.tileSize },
        options: {
          overlays: [getBoardCarryOverlay("n")],
        },
      },
    ]);

    this.animSeqStandUp = new AnimationSequence(this.skater, [
      {
        anim: "walk-board-s",
        type: TransitionType.Distance,
        transition: { dx: 0, dy: this.skater.tileSize },
        options: {
          overlays: [getBoardCarryOverlay("s")],
        },
      },
    ]);
  }

  init() {
    if (this.duration !== null) {
      this.timer!.start(this.duration);
    }

    this.skater.direction = "s";

    this.animSeqSitDown!.start();
    this.skater.direction = "n";
  }

  update(dt: number): void {
    if (this.animSeqStandUp?.hasStarted()) {
      this.animSeqStandUp.update(dt);

      if (this.animSeqStandUp.isFinished) {
        this.skater.direction = "s";
        this.skater.pos.y = this.bench.pos.y + this.bench.height;
        this.skater.animations.play("idle-stand-s", {
          overlays: [getBoardCarryOverlay(this.skater.direction, true)],
        });
        this.animSeqStandUp.finish();
        this.animSeqStandUp = null;
        this.isReadyToCruise = true;
      }
      return;
    }

    if (this.animSeqSitDown?.hasStarted()) {
      if (this.animSeqSitDown.isFinished) {
        const overlays = [
          {
            name: "board-sit-s",
            drawOnTop: true,
            drawBehind: false,
            dy: this.skater.tileSize * 0.5 + 2,
            dx: 0,
          },
        ];

        if (this.isDrinking) {
          overlays.push({
            name: `drink${randomInt(1, 4)}`,
            drawOnTop: true,
            drawBehind: false,
            dy: 25,
            dx: 7,
          });
        }
        this.animSeqSitDown.finish();
        this.skater.pos.y -= 4;
        this.skater.direction = "s";
        this.skater.animations.play(
          this.isDrinking ? "idle-sit-drink-s" : "idle-sit-s",
          {
            overlays,
          },
        );
        this.animSeqSitDown = null;
      } else {
        this.animSeqSitDown.update(dt);
      }
      return;
    }

    if (
      this.timer !== null &&
      !this.timer.isRunning &&
      !this.play.skateGround.isSkateGroundBlocked()
    ) {
      this.timer.stop();
      this.skater.pos.y += 4;
      this.animSeqStandUp!.start();
      this.timer = null;
      this.play.skateGround.blockSkateGround(this.skater.id);

      return;
    }
  }

  isComplete(): boolean {
    return this.isReadyToCruise === true;
  }
}

export interface SkateUpdatable extends Updatable {
  readonly tag: SkateActionTag;
}

const spec = {
  skate: { ctor: Skate },
  "cruise-to": { ctor: CruiseTo },
  bench: { ctor: SitOnBench },
  "vending-machine-shopping": { ctor: VendingMachineShopping },
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

export type SkateActionTag = keyof SkateActionSpec;

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor]),
) as { [K in SkateActionTag]: (typeof spec)[K]["ctor"] };
