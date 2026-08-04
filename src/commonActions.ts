import type { ActionTag, Updatable } from "./actions";
import type Human from "./Human";
import type { Vec2 } from "./lib";
import type { Direction } from "./lib/types";
import { AnimationSequence, TransitionType } from "./lib";
import type { OverlayOptions } from "./lib";
import { findClosestFreeCell } from "./grid";
import { Path } from "./lib";
import type Play from "./Play";
import Timer from "./Timer";
import { cellToPos, isSamePos, posToCell } from "./lib";

export interface CommonUpdatable extends Updatable {
  readonly tag: CommonActionTag;
}

export class GoTo implements CommonUpdatable {
  static TAG: "go-to" = "go-to";
  readonly tag: "go-to" = GoTo.TAG;
  private path: Path | null;
  private human: Human;
  private pos: Vec2;
  private walkAnimBase: string;
  private idleAnimBase: string;
  private pathStartPos: Vec2;
  private pathGoalPos: Vec2;
  private preApproach: AnimationSequence | null;
  private finalApproach: AnimationSequence | null;
  private overlayFn?: (human: Human) => OverlayOptions;

  constructor(
    human: Human,
    pos: Vec2,
    animBase?: {
      walk: string;
      idle: string;
      overlayFn?: (human: Human) => OverlayOptions;
    },
  ) {
    this.human = human;
    this.path = null;
    this.pos = pos;
    this.pathStartPos = { ...human.pos };
    this.pathGoalPos = pos;
    this.preApproach = null;
    this.finalApproach = null;
    this.walkAnimBase = animBase?.walk ?? "walk";
    this.idleAnimBase = animBase?.idle ?? "idle-stand";
    this.overlayFn = animBase?.overlayFn;
  }

  init() {
    const scene = this.human.scene as Play;
    const tileSize = scene.art!.tileSize;
    const roundedStartPos = {
      x: Math.round(this.human.pos.x / tileSize) * tileSize,
      y: Math.round(this.human.pos.y / tileSize) * tileSize,
    };
    const roundedStartCell = posToCell(roundedStartPos, tileSize);

    let startCell = roundedStartCell;
    if (scene.parkGrid[roundedStartCell.row]?.[roundedStartCell.col] !== 0) {
      const freeCell = findClosestFreeCell(
        roundedStartCell,
        scene.parkGrid,
        [0],
      );
      if (freeCell !== null) {
        startCell = freeCell;
      }
    }
    this.pathStartPos = cellToPos(startCell, tileSize);

    const roundedGoalPos = {
      x: Math.round(this.pos.x / tileSize) * tileSize,
      y: Math.round(this.pos.y / tileSize) * tileSize,
    };
    const roundedGoalCell = posToCell(roundedGoalPos, tileSize);

    let goalCell = roundedGoalCell;
    if (scene.parkGrid[roundedGoalCell.row]?.[roundedGoalCell.col] !== 0) {
      const freeCell = findClosestFreeCell(
        roundedGoalCell,
        scene.parkGrid,
        [0],
      );
      if (freeCell !== null) {
        goalCell = freeCell;
      }
    }

    this.pathGoalPos = cellToPos(goalCell, tileSize);

    if (isSamePos(this.human.pos, this.pathStartPos)) {
      this.path = new Path(this.human, this.pathGoalPos, scene.parkGrid);
    }

    console.log(this.path);
    console.log(posToCell(this.human.pos, this.human.scene.art!.tileSize));
  }

  update(dt: number): void {
    const scene = this.human.scene as Play;

    if (this.path === null) {
      if (
        this.preApproach === null &&
        !isSamePos(this.human.pos, this.pathStartPos)
      ) {
        const dx = this.pathStartPos.x - this.human.pos.x;
        const dy = this.pathStartPos.y - this.human.pos.y;
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
                overlay: this.overlayFn
                  ? this.overlayFn(this.human)
                  : undefined,
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
                overlay: this.overlayFn
                  ? this.overlayFn(this.human)
                  : undefined,
              },
            }),
          );
        }

        if (steps.length > 0) {
          this.preApproach = new AnimationSequence(this.human, steps);
          this.preApproach.start();
        } else {
          this.human.pos = { ...this.pathStartPos };
          this.path = new Path(this.human, this.pathGoalPos, scene.parkGrid);
        }
      }

      if (this.preApproach !== null) {
        this.preApproach.update(dt);

        if (this.preApproach.isFinished) {
          this.human.pos = { ...this.pathStartPos };
          this.preApproach = null;
          this.path = new Path(this.human, this.pathGoalPos, scene.parkGrid);
        }
      }

      return;
    }

    if (!this.path.hasReachedGoal) {
      this.path.update(dt);
      const animDirection = this.getAnimDirection();

      if (
        !this.human.animations.isPlaying(
          `${this.walkAnimBase}-${animDirection}`,
        )
      ) {
        this.human.animations.play(`${this.walkAnimBase}-${animDirection}`, {
          overlay: this.overlayFn ? this.overlayFn(this.human) : undefined,
        });
      }
      return;
    }

    if (this.finalApproach === null && !isSamePos(this.human.pos, this.pos)) {
      const dx = this.pos.x - this.human.pos.x;
      const dy = this.pos.y - this.human.pos.y;
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
              overlay: this.overlayFn ? this.overlayFn(this.human) : undefined,
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
              overlay: this.overlayFn ? this.overlayFn(this.human) : undefined,
            },
          }),
        );
      }

      if (steps.length > 0) {
        this.finalApproach = new AnimationSequence(this.human, steps);
        this.finalApproach.start();
      }
    }

    if (this.finalApproach !== null) {
      this.finalApproach.update(dt);

      if (this.finalApproach.isFinished) {
        this.human.pos.x = this.pos.x;
        this.human.pos.y = this.pos.y;
        this.finalApproach = null;
      }
    }

    if (this.finalApproach === null) {
      const animDirection = this.getAnimDirection();
      this.human.animations.play(`${this.idleAnimBase}-${animDirection}`, {
        overlay: this.overlayFn ? this.overlayFn(this.human) : undefined,
      });
    }
  }

  isComplete(): boolean {
    if (this.path === null) return false;

    if (this.preApproach !== null) return false;
    if (!this.path.hasReachedGoal) return false;
    if (this.finalApproach !== null) return false;
    if (!isSamePos(this.human.pos, this.pos)) return false;

    return this.human.animations.isPlaying(
      `${this.idleAnimBase}-${this.getAnimDirection()}`,
    );
  }

  private getAnimDirection(): "n" | "e" | "s" | "w" {
    switch (this.human.direction) {
      case "n":
      case "ne":
      case "nw":
        return "n";
      case "s":
      case "se":
      case "sw":
        return "s";
      case "e":
        return "e";
      case "w":
        return "w";
      default:
        return "s";
    }
  }
}

export class ContinousAnim implements CommonUpdatable {
  static TAG: "continous-anim" = "continous-anim";
  readonly tag: "continous-anim" = ContinousAnim.TAG;

  private human: Human;
  private anim: string;
  private timer: Timer;
  private duration: number;
  private hasStarted: boolean;

  constructor(human: Human, anim: string, duration: number) {
    this.human = human;
    this.anim = anim;
    this.duration = duration;
    this.hasStarted = false;
    this.human.animations.play(anim);
    this.timer = new Timer();
  }

  init() {}

  update(_: number): void {
    if (!this.hasStarted) {
      this.human.animations.play(this.anim);
      this.timer.start(this.duration);
    }
  }

  isComplete(): boolean {
    return this.hasStarted && this.timer.isStopped;
  }
}

export class TransitionActionTick implements CommonUpdatable {
  static TAG: "transition-tick" = "transition-tick";
  readonly tag: "transition-tick" = TransitionActionTick.TAG;
  private human: Human;
  private anim: string;
  action: ActionTag;

  constructor(human: Human, anim: string, action: ActionTag) {
    this.human = human;
    this.anim = anim;
    this.human.animations.play(anim);
    this.action = action;
  }

  init() {}

  update(_: number): void {}

  isComplete(): boolean {
    return !this.human.animations.isPlaying(this.anim);
  }
}

export class TransitionAnim implements CommonUpdatable {
  static TAG: "transition-anim" = "transition-anim";
  readonly tag: "transition-anim" = TransitionAnim.TAG;
  private human: Human;
  private anim: string;

  constructor(human: Human, anim: string) {
    this.human = human;
    this.anim = anim;
    this.human.animations.play(anim);
  }

  init() {}

  update(_: number): void {}

  isComplete(): boolean {
    return !this.human.animations.isPlaying(this.anim);
  }
}

export class SitOnBench implements CommonUpdatable {
  static TAG: "sit-bench" = "sit-bench";
  readonly tag: "sit-bench" = SitOnBench.TAG;
  private human: Human;
  private timer: Timer | null;

  constructor(human: Human, durationMs: number | "ever") {
    this.human = human;
    this.human.action = this.tag;
    this.timer = null;

    if (durationMs !== "ever") {
      this.timer = new Timer();
      this.timer.start(durationMs);
    }
  }

  init() {}

  update(_: number): void {
    if (!this.human.animations.isPlaying("idle-sit-s")) {
      this.human.direction = "s";
      this.human.animations.play("idle-sit-s");
    }
  }

  isComplete(): boolean {
    return this.timer !== null && this.timer.isStopped;
  }
}

export class SitOnGrass implements CommonUpdatable {
  static TAG: "sit-grass" = "sit-grass";
  readonly tag: "sit-grass" = SitOnGrass.TAG;
  private human: Human;
  private direction: "n" | "e" | "s" | "w";
  private timer: Timer | null;

  constructor(human: Human, direction: Direction, durationMs: number | "ever") {
    this.human = human;
    this.human.action = this.tag;
    this.direction = SitOnGrass.toSitDirection(direction);
    this.timer = null;

    if (durationMs !== "ever") {
      this.timer = new Timer();
      this.timer.start(durationMs);
    }
  }

  init() {}

  update(_: number): void {
    if (!this.human.animations.isPlaying(`idle-sit-${this.direction}`)) {
      this.human.direction = this.direction;
      this.human.animations.play(`idle-sit-${this.direction}`);
    }
  }

  isComplete(): boolean {
    return this.timer !== null && this.timer.isStopped;
  }

  private static toSitDirection(dir: Direction): "n" | "e" | "s" | "w" {
    switch (dir) {
      case "n":
      case "e":
      case "s":
      case "w":
        return dir;
      case "ne":
      case "nw":
        return "n";
      case "se":
      case "sw":
        return "s";
      default:
        return "s";
    }
  }
}

const spec = {
  "go-to": { ctor: GoTo },
  "transition-anim": { ctor: TransitionAnim },
  "transition-tick": { ctor: TransitionActionTick },
  "continous-anim": { ctor: ContinousAnim },
  "sit-bench": { ctor: SitOnBench },
  "sit-grass": { ctor: SitOnGrass },
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
