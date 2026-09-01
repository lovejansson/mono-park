import type { Updatable } from "./actions";
import type { Sprite, Vec2 } from "./lib";
import type { Direction } from "./lib/types";
import { AnimationSequence, posToTile, TransitionType } from "./lib";
import type { OverlayOptions } from "./lib";
import { Path } from "./lib";
import type Play from "./Play";
import Timer from "./Timer";
import { isSamePos } from "./lib";
import type Bench from "./Bench";
import type Human from "./Human";
import { GroundArea } from "./lib/Grid";

export interface CommonUpdatable extends Updatable {
  readonly tag: CommonActionTag;
}

function isWholeTile(pos: Vec2, tileSize: number): boolean {
  return pos.x % tileSize === 0 && pos.y % tileSize === 0;
}

function getNearestWholeTile(pos: Vec2, tileSize: number): Vec2 {
  return {
    x: Math.round(pos.x / tileSize) * tileSize,
    y: Math.round(pos.y / tileSize) * tileSize,
  };
}

function getWholeTileTowardTarget(
  from: Vec2,
  target: Vec2,
  tileSize: number,
): Vec2 {
  const x = isWholeTile({ x: from.x, y: 0 }, tileSize)
    ? from.x
    : target.x >= from.x
      ? Math.ceil(from.x / tileSize) * tileSize
      : Math.floor(from.x / tileSize) * tileSize;

  const y = isWholeTile({ x: 0, y: from.y }, tileSize)
    ? from.y
    : target.y >= from.y
      ? Math.ceil(from.y / tileSize) * tileSize
      : Math.floor(from.y / tileSize) * tileSize;

  return { x, y };
}

export class GoTo implements CommonUpdatable {
  static TAG: "go-to" = "go-to";
  readonly tag: "go-to" = GoTo.TAG;
  private path: Path | null;
  private human: Human;
  private actualGoalPos: Vec2;
  private walkAnimBase: string;
  private idleAnimBase: string;
  private pathStartPos: Vec2;
  private pathGoalPos: Vec2;
  private startAlignSeq: AnimationSequence | null;
  private endAlignSeq: AnimationSequence | null;
  private hasPathPhaseFinished: boolean;
  private overlayFn?: (sprite: Sprite) => OverlayOptions;
  private walkableTiles: GroundArea[];
  private startDelay: number;
  private delayTimer: Timer;
  private preBlockTiles?: Vec2[];

  constructor(
    human: Human,
    pos: Vec2,
    walkableTiles: GroundArea[] = [GroundArea.GRASS, GroundArea.GRAVEL],
    preBlockTiles?: Vec2[],
    startDelay: number = 0,
    animBase?: {
      walk: string;
      idle: string;
      overlayFn?: (sprite: Sprite) => OverlayOptions;
    },
  ) {
    this.human = human;
    this.path = null;
    this.actualGoalPos = { ...pos };
    this.pathStartPos = { ...human.pos };
    this.pathGoalPos = { ...pos };
    this.startAlignSeq = null;
    this.endAlignSeq = null;
    this.hasPathPhaseFinished = false;
    this.walkAnimBase = animBase?.walk ?? "walk";
    this.idleAnimBase = animBase?.idle ?? "idle-stand";
    this.overlayFn = animBase?.overlayFn;
    this.walkableTiles = walkableTiles;
    this.startDelay = startDelay;
    this.delayTimer = new Timer();
    this.preBlockTiles = preBlockTiles;
  }

  init() {
    const scene = this.human.scene as Play;
    const tileSize = scene.art!.tileSize;

    this.pathGoalPos = getNearestWholeTile(this.actualGoalPos, tileSize);
    this.pathStartPos = isWholeTile(this.human.pos, tileSize)
      ? { ...this.human.pos }
      : getWholeTileTowardTarget(this.human.pos, this.actualGoalPos, tileSize);

    this.startAlignSeq = this.buildMoveSequence(this.pathStartPos);

    if (this.startDelay > 0) {
      this.delayTimer.start(this.startDelay);
      // Preoccupy before we can start real path which will occupy the goal there, to prevent others from occupying our goal
      scene.grid.occupyTile(this.human.id, this.pathGoalPos);
    } else if (this.startAlignSeq !== null) {
      this.startAlignSeq.start();
      // Preoccupy before we can start real path which will occupy the goal there, to prevent others from occupying our goal
      scene.grid.occupyTile(this.human.id, this.pathGoalPos);
    } else {
      this.startPathPhase(scene);
    }
  }

  update(dt: number): void {
    const scene = this.human.scene as Play;

    if (this.startDelay > 0) {
      this.delayTimer.update(dt);
      if (!this.delayTimer.isRunning) {
        this.startDelay = 0;
        this.delayTimer.stop();
        if (this.startAlignSeq !== null) {
          this.startAlignSeq.start();
        } else {
          this.startPathPhase(scene);
        }
      }
      return;
    }

    if (this.startAlignSeq !== null) {
      this.startAlignSeq.update(dt);

      if (this.startAlignSeq.isFinished) {
        this.startAlignSeq.finish();
        this.startAlignSeq = null;
        this.startPathPhase(scene);
      }

      return;
    }

    if (!this.hasPathPhaseFinished) {
      if (this.path !== null && !this.path.hasReachedGoal) {
        if (this.path.hasStarted) {
          this.path.update(dt);
          if (this.path.isWaiting) {
            if (
              !this.human.animations.isPlaying(
                `${this.idleAnimBase}-${this.human.direction}`,
              )
            ) {
              this.human.animations.play(
                `${this.idleAnimBase}-${this.human.direction}`,
              );
            }

            return;
          }

          if (
            !this.human.animations.isPlaying(
              `${this.walkAnimBase}-${this.human.direction}`,
            )
          ) {
            this.human.animations.play(
              `${this.walkAnimBase}-${this.human.direction}`,
              {
                overlays: this.overlayFn
                  ? [this.overlayFn(this.human)]
                  : undefined,
              },
            );
          }
        } else {
          // Try start path again.

          this.startPath();
          if (
            !this.human.animations.isPlaying(
              `${this.idleAnimBase}-${this.human.direction}`,
            )
          ) {
            this.human.animations.play(
              `${this.idleAnimBase}-${this.human.direction}`,
            );
          }

          return;
        }

        return;
      }

      this.hasPathPhaseFinished = true;
      this.endAlignSeq = this.buildMoveSequence(this.actualGoalPos);

      if (this.endAlignSeq !== null) {
        this.endAlignSeq.start();
      }

      return;
    }

    if (this.endAlignSeq !== null) {
      this.endAlignSeq.update(dt);

      if (this.endAlignSeq.isFinished) {
        this.endAlignSeq.finish();
        this.endAlignSeq = null;
      }

      return;
    }

    const animDirection = this.human.direction;
    if (
      !this.human.animations.isPlaying(`${this.idleAnimBase}-${animDirection}`)
    ) {
      this.human.animations.play(`${this.idleAnimBase}-${animDirection}`, {
        overlays: this.overlayFn ? [this.overlayFn(this.human)] : undefined,
      });
    }
  }

  isComplete(): boolean {
    if (this.startAlignSeq !== null) return false;
    if (!this.hasPathPhaseFinished) return false;
    if (this.endAlignSeq !== null) return false;
    if (!isSamePos(this.human.pos, this.actualGoalPos)) return false;

    return this.human.animations.isPlaying(
      `${this.idleAnimBase}-${this.human.direction}`,
    );
  }

  private startPathPhase(scene: Play): void {
    if (!isSamePos(this.human.pos, this.pathStartPos)) {
      throw new Error("Sprite is not at start pos of path");
    }

    if (isSamePos(this.pathStartPos, this.pathGoalPos)) {
      this.path = null;
      this.hasPathPhaseFinished = true;
      this.endAlignSeq = this.buildMoveSequence(this.actualGoalPos);

      if (this.endAlignSeq !== null) {
        this.endAlignSeq.start();
      }

      return;
    }

    // Unoccupy goal tile if its already blocked by us?
    const goalTile = posToTile(this.pathGoalPos, scene.art.tileSize);

    if (scene.grid.isTileOccupied(goalTile)) {
      const occupant = scene.grid.getSpriteAtOccupiedTile(goalTile);

      if (occupant !== this.human.id)
        throw new Error(`Someone else occupied path goal: ${occupant}`);

      scene.grid.unoccupyTile(this.human.id, this.pathGoalPos);
    }

    this.path = new Path(this.human, this.pathGoalPos, this.walkableTiles);

    this.startPath();
  }

  private startPath(): void {
    if (this.path === null) throw new Error("Path is not created yet");
    if (this.preBlockTiles) {
      for (const p of this.preBlockTiles) {
        this.human.scene.grid.blockTile(this.human.id, p);
      }
    }

    this.path.start();

    if (this.preBlockTiles) {
      for (const p of this.preBlockTiles) {
        this.human.scene.grid.unBlockTile(this.human.id, p);
      }
    }
  }

  private buildMoveSequence(target: Vec2): AnimationSequence | null {
    if (isSamePos(this.human.pos, target)) return null;

    const dx = target.x - this.human.pos.x;
    const dy = target.y - this.human.pos.y;
    const steps: ConstructorParameters<typeof AnimationSequence>[1] = [];

    if (dx !== 0) {
      const xDir = dx > 0 ? "e" : "w";
      this.human.direction = xDir;
      steps.push(
        AnimationSequence.createAnim({
          anim: `${this.walkAnimBase}-${xDir}`,
          type: TransitionType.Distance,
          transition: { dx, dy: 0 },
          options: {
            overlays: this.overlayFn ? [this.overlayFn(this.human)] : undefined,
          },
        }),
      );
    }

    if (dy !== 0) {
      const yDir = dy > 0 ? "s" : "n";
      this.human.direction = yDir;
      steps.push(
        AnimationSequence.createAnim({
          anim: `${this.walkAnimBase}-${yDir}`,
          type: TransitionType.Distance,
          transition: { dx: 0, dy },
          options: {
            overlays: this.overlayFn ? [this.overlayFn(this.human)] : undefined,
          },
        }),
      );
    }

    if (steps.length === 0) return null;

    return new AnimationSequence(this.human, steps);
  }
}

export class StandIdle implements CommonUpdatable {
  static TAG: "stand-idle" = "stand-idle";
  readonly tag: "stand-idle" = StandIdle.TAG;
  private human: Human;
  private direction: Direction;
  private timer: Timer;
  private duration: number | null;

  constructor(
    human: Human,
    direction: Direction,
    duration: number | null = null,
  ) {
    this.human = human;
    this.human.action = this.tag;
    this.direction = direction;
    this.duration = duration;
    this.timer = new Timer();
  }

  init() {
    if (this.duration !== null) {
      this.timer.start(this.duration);
    }
  }

  update(dt: number): void {
    this.timer.update(dt);
    if (!this.human.animations.isPlaying(`idle-stand-${this.direction}`)) {
      this.human.direction = this.direction;
      this.human.animations.play(`idle-stand-${this.direction}`);
    }

    if (!this.timer.isRunning) {
      this.timer.stop();
    }
  }

  isComplete(): boolean {
    return this.timer !== null && !this.timer.isRunning;
  }
}

export class SittingOnBench implements CommonUpdatable {
  static TAG: "sit-bench" = "sit-bench";
  readonly tag: "sit-bench" = SittingOnBench.TAG;
  private human: Human;
  private timer: Timer | null;
  private duration: number | null;
  private bench: Bench;
  private animSeqSitDown: AnimationSequence | null;
  private animSeqStandUp: AnimationSequence | null;

  constructor(human: Human, bench: Bench, duration: number | null = null) {
    this.human = human;
    this.human.action = this.tag;
    this.duration = duration;
    this.bench = bench;
    this.timer = new Timer();
    this.animSeqSitDown = new AnimationSequence(this.human, [
      {
        anim: "walk-n",
        type: TransitionType.Distance,
        transition: { dx: 0, dy: -this.human.tileSize },
      },
    ]);

    this.animSeqStandUp = new AnimationSequence(this.human, [
      {
        anim: "walk-s",
        type: TransitionType.Distance,
        transition: { dx: 0, dy: this.human.tileSize },
      },
    ]);
  }

  init() {
    if (this.duration !== null) {
      this.timer!.start(this.duration);
    }

    this.human.direction = "s";

    this.animSeqSitDown!.start();
    this.human.direction = "n";
  }

  update(dt: number): void {
    if (this.timer !== null) this.timer.update(dt);

    if (this.animSeqStandUp?.hasStarted()) {
      if (this.animSeqStandUp.isFinished) {
        this.animSeqStandUp.finish();

        this.human.direction = "s";
        this.human.pos.y = this.bench.pos.y + this.bench.height;
        this.human.animations.play("idle-stand-s");
        this.animSeqStandUp = null;
      } else {
        this.animSeqStandUp.update(dt);
      }
      return;
    }

    if (this.animSeqSitDown?.hasStarted()) {
      if (this.animSeqSitDown.isFinished) {
        this.animSeqSitDown.finish();

        this.human.pos.y -= 4;
        this.human.direction = "s";
        this.human.animations.play("idle-sit-s");
        this.animSeqSitDown = null;
      } else {
        this.animSeqSitDown.update(dt);
      }
      return;
    }

    if (this.timer !== null && !this.timer.isRunning) {
      this.human.pos.y += 4;
      this.animSeqStandUp!.start();
      this.timer.stop();
      this.timer = null;

      return;
    }
  }

  isComplete(): boolean {
    return this.animSeqStandUp === null;
  }
}

export class SitOnGrass implements CommonUpdatable {
  static TAG: "sit-grass" = "sit-grass";
  readonly tag: "sit-grass" = SitOnGrass.TAG;
  private human: Human;
  private direction: Direction;
  private timer: Timer;
  private duration: number | null;

  constructor(
    human: Human,
    direction: Direction,
    duration: number | null = null,
  ) {
    this.human = human;
    this.human.action = this.tag;
    this.direction = direction;
    this.duration = duration;
    this.timer = new Timer();
  }

  init() {
    if (this.duration !== null) {
      this.timer.start(this.duration);
    }
  }

  update(dt: number): void {
    if (this.timer !== null) this.timer.update(dt);

    if (!this.human.animations.isPlaying(`idle-sit-${this.direction}`)) {
      this.human.direction = this.direction;
      this.human.animations.play(`idle-sit-${this.direction}`);
    }

    if (!this.timer.isRunning) {
      this.timer.stop();
    }
  }

  isComplete(): boolean {
    return this.timer !== null && !this.timer.isRunning;
  }
}

const spec = {
  "go-to": { ctor: GoTo },
  "sit-bench": { ctor: SittingOnBench },
  "sit-grass": { ctor: SitOnGrass },
  "stand-idle": { ctor: StandIdle },
} as const;

export type CommonActionSpec = {
  [K in keyof typeof spec]: {
    args: ConstructorParameters<(typeof spec)[K]["ctor"]>;
    result: InstanceType<(typeof spec)[K]["ctor"]>;
  };
};

export type CommonActionTag = keyof CommonActionSpec;

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor]),
) as { [K in CommonActionTag]: (typeof spec)[K]["ctor"] };
