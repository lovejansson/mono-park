import type { Updatable } from "./actions";
import type { Sprite, Vec2 } from "./lib";
import type { Direction } from "./lib/types";
import { AnimationSequence, getPosDiff, TransitionType } from "./lib";
import type { OverlayOptions } from "./lib";
import { Path } from "./lib";
import type Play from "./Play";
import Timer from "./Timer";
import { isSamePos } from "./lib";
import type Bench from "./Bench";
import type Human from "./Human";

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

function getWholeTileTowardTarget(from: Vec2, target: Vec2, tileSize: number): Vec2 {
  const x =
    isWholeTile({ x: from.x, y: 0 }, tileSize)
      ? from.x
      : target.x >= from.x
        ? Math.ceil(from.x / tileSize) * tileSize
        : Math.floor(from.x / tileSize) * tileSize;

  const y =
    isWholeTile({ x: 0, y: from.y }, tileSize)
      ? from.y
      : target.y >= from.y
        ? Math.ceil(from.y / tileSize) * tileSize
        : Math.floor(from.y / tileSize) * tileSize;

  return { x, y };
}

export class FollowTheLeader implements CommonUpdatable {
  static TAG: "follow-the-leader" = "follow-the-leader";
  readonly tag: "follow-the-leader" = FollowTheLeader.TAG;
  private static readonly DETACH_DISTANCE_IN_TILES = 3;

  private human: Human;
  private shouldDetach: boolean;

  constructor(human: Human) {
    this.human = human;
    this.shouldDetach = false;
  }

  init(): void {
    this.human.animations.play(`walk-${this.human.direction}`);
  }

  update(_: number): void {
    /**
     * Each update the follower will check if the current slot target is still valid, i.e. is not occupied by for example a tree, then caclulate the distance to that slot 
     * and set the direction to head for the slot.
     */

    let slot: Direction;

    try {
      slot = this.human.group.getFollowerSlot(this.human.id);
    } catch {
      slot = this.human.group.setFollowerSlot(this.human.id);
    }

    // if (!this.human.group.isWalking()) {
    //   this.human.animations.play(`idle-stand-${this.human.direction}`);
    //   return;
    // }

    if (!this.human.group.isSlotValid(slot)) {
      slot = this.human.group.getNewSlot(this.human.id);
    }

    const slotPos = this.human.group.getSlotPos(slot);

    const diff = getPosDiff(slotPos, this.human.pos);
    const tileSize = this.human.scene.art!.tileSize;
    const detachThresholdPx =
      tileSize * FollowTheLeader.DETACH_DISTANCE_IN_TILES;

    // Once follower is close enough to its assigned slot, let GoTo finish precisely.
    if (
      Math.abs(diff.x) <= detachThresholdPx &&
      Math.abs(diff.y) <= detachThresholdPx
    ) {
      this.shouldDetach = true;
      this.human.animations.play(`idle-stand-${this.human.direction}`);
      return;
    }

    if (diff.x !== 0 || diff.y !== 0) {
      const absX = Math.abs(diff.x);
      const absY = Math.abs(diff.y);

      if (absY > absX) {
        this.human.direction = diff.y > 0 ? "s" : "n";
      } else {
        this.human.direction = diff.x > 0 ? "e" : "w";
      }

      if (!this.human.animations.isPlaying(`walk-${this.human.direction}`)) {
        this.human.animations.play(`walk-${this.human.direction}`);
      }
    }
    // } else {
    //   this.human.animations.play(`idle-stand-${this.human.direction}`);
    // }
  }

  isComplete(): boolean {
    return !this.human.group.isWalking() || this.shouldDetach;
  }
}

export class GoTo implements CommonUpdatable {
  static TAG: "go-to" = "go-to";
  readonly tag: "go-to" = GoTo.TAG;
  private path: Path | null;
  private sprite: Sprite;
  private actualGoalPos: Vec2;
  private walkAnimBase: string;
  private idleAnimBase: string;
  private pathStartPos: Vec2;
  private pathGoalPos: Vec2;
  private startAlignSeq: AnimationSequence | null;
  private endAlignSeq: AnimationSequence | null;
  private hasPathPhaseFinished: boolean;
  private overlayFn?: (sprite: Sprite) => OverlayOptions;

  constructor(
    human: Sprite,
    pos: Vec2,
    animBase?: {
      walk: string;
      idle: string;
      overlayFn?: (sprite: Sprite) => OverlayOptions;
    },
  ) {
    this.sprite = human;
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
  }

  init() {
    const scene = this.sprite.scene as Play;
    const tileSize = scene.art!.tileSize;

    this.pathGoalPos = getNearestWholeTile(this.actualGoalPos, tileSize);
    this.pathStartPos = isWholeTile(this.sprite.pos, tileSize)
      ? { ...this.sprite.pos }
      : getWholeTileTowardTarget(this.sprite.pos, this.actualGoalPos, tileSize);

    this.startAlignSeq = this.buildMoveSequence(this.pathStartPos);

    if (this.startAlignSeq !== null) {
      this.startAlignSeq.start();
    } else {
      this.startPathPhase(scene);
    }
  }

  update(dt: number): void {
    const scene = this.sprite.scene as Play;

    if (this.startAlignSeq !== null) {
      this.startAlignSeq.update(dt);

      if (this.startAlignSeq.isFinished) {
        this.startAlignSeq = null;
        this.startPathPhase(scene);
      }

      return;
    }

    if (!this.hasPathPhaseFinished) {
      if (this.path !== null && !this.path.hasReachedGoal) {
        this.path.update(dt);
        const animDirection = this.getAnimDirection();

        if (
          !this.sprite.animations.isPlaying(
            `${this.walkAnimBase}-${animDirection}`,
          )
        ) {
          this.sprite.animations.play(`${this.walkAnimBase}-${animDirection}`, {
            overlay: this.overlayFn ? this.overlayFn(this.sprite) : undefined,
          });
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
        this.endAlignSeq = null;
      }

      return;
    }

    const animDirection = this.getAnimDirection();
    if (!this.sprite.animations.isPlaying(`${this.idleAnimBase}-${animDirection}`)) {
      this.sprite.animations.play(`${this.idleAnimBase}-${animDirection}`, {
        overlay: this.overlayFn ? this.overlayFn(this.sprite) : undefined,
      });
    }
  }

  isComplete(): boolean {
    if (this.startAlignSeq !== null) return false;
    if (!this.hasPathPhaseFinished) return false;
    if (this.endAlignSeq !== null) return false;
    if (!isSamePos(this.sprite.pos, this.actualGoalPos)) return false;

    return this.sprite.animations.isPlaying(
      `${this.idleAnimBase}-${this.getAnimDirection()}`,
    );
  }

  private startPathPhase(scene: Play): void {
    if (!isSamePos(this.sprite.pos, this.pathStartPos)) {
      return;
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

    this.path = new Path(this.sprite, this.pathGoalPos, scene.parkGrid);
  }

  private buildMoveSequence(target: Vec2): AnimationSequence | null {
    if (isSamePos(this.sprite.pos, target)) return null;

    const dx = target.x - this.sprite.pos.x;
    const dy = target.y - this.sprite.pos.y;
    const steps: ConstructorParameters<typeof AnimationSequence>[1] = [];

    if (dx !== 0) {
      const xDir = dx > 0 ? "e" : "w";
      this.sprite.direction = xDir;
      steps.push(
        AnimationSequence.createAnim({
          anim: `${this.walkAnimBase}-${xDir}`,
          type: TransitionType.Distance,
          transition: { dx, dy: 0 },
          options: {
            overlay: this.overlayFn ? this.overlayFn(this.sprite) : undefined,
          },
        }),
      );
    }

    if (dy !== 0) {
      const yDir = dy > 0 ? "s" : "n";
      this.sprite.direction = yDir;
      steps.push(
        AnimationSequence.createAnim({
          anim: `${this.walkAnimBase}-${yDir}`,
          type: TransitionType.Distance,
          transition: { dx: 0, dy },
          options: {
            overlay: this.overlayFn ? this.overlayFn(this.sprite) : undefined,
          },
        }),
      );
    }

    if (steps.length === 0) return null;

    return new AnimationSequence(this.sprite, steps);
  }

  private getAnimDirection(): "n" | "e" | "s" | "w" {
    switch (this.sprite.direction) {
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

  update(_: number): void {
    if (!this.human.animations.isPlaying(`idle-stand-${this.direction}`)) {
      this.human.direction = this.direction;
      this.human.animations.play(`idle-stand-${this.direction}`);
    }
  }

  isComplete(): boolean {
    return this.timer !== null && this.timer.isStopped;
  }
}

export class SitOnBench implements CommonUpdatable {
  static TAG: "sit-bench" = "sit-bench";
  readonly tag: "sit-bench" = SitOnBench.TAG;
  private human: Human;
  private timer: Timer;
  private duration: number | null;
  private bench: Bench;

  constructor(human: Human, bench: Bench, duration: number | null = null) {
    this.human = human;
    this.human.action = this.tag;
    this.duration = duration;
    this.bench = bench;
    this.timer = new Timer();
  }

  init() {
    if (this.duration !== null) {
      this.timer.start(this.duration);
    }

    this.human.direction = "s";
    this.human.animations.play("idle-sit-s");
    this.human.pos.x = this.bench.pos.x;
    this.human.pos.y = this.bench.pos.y + (this.human.tileSize / 4) * 3;
  }
  update(_: number): void {}

  isComplete(): boolean {
    return this.timer !== null && this.timer.isStopped;
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

  update(_: number): void {
    if (!this.human.animations.isPlaying(`idle-sit-${this.direction}`)) {
      this.human.direction = this.direction;
      this.human.animations.play(`idle-sit-${this.direction}`);
    }
  }

  isComplete(): boolean {
    return this.timer !== null && this.timer.isStopped;
  }
}

const spec = {
  "go-to": { ctor: GoTo },
  "sit-bench": { ctor: SitOnBench },
  "sit-grass": { ctor: SitOnGrass },
  "stand-idle": { ctor: StandIdle },
  "follow-the-leader": { ctor: FollowTheLeader },
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
