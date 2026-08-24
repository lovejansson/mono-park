import { type AnimationOptions } from "./AnimationManager";
import type Sprite from "../objects/Sprite";

export enum TransitionType {
  Distance, // Animation changes when sprite has moved enough distance
  Time, // Animation changes when enough time ms as passed
  Finished, // Animation changes when the current animation is done
}

type TransitionCondition<T extends TransitionType> =
  T extends TransitionType.Distance
    ? { dx: number; dy: number }
    : T extends TransitionType.Time
      ? { duration: number }
      : null;

export type SequenceAnimationT<T extends TransitionType> = {
  type: T;
  anim: string;
  options?: AnimationOptions;
  transition: TransitionCondition<T>;
};

export type SequenceAnimation =
  | SequenceAnimationT<TransitionType.Distance>
  | SequenceAnimationT<TransitionType.Time>
  | SequenceAnimationT<TransitionType.Finished>;

type PlayingAnimationT<T extends TransitionType> =
  T extends TransitionType.Distance
    ? { type: T; anim: SequenceAnimationT<T> } & { x: number; y: number }
    : T extends TransitionType.Time
      ? { type: T; anim: SequenceAnimationT<T> } & { duration: number }
      : { type: T; anim: SequenceAnimationT<T> };

type PlayingAnimation =
  | PlayingAnimationT<TransitionType.Distance>
  | PlayingAnimationT<TransitionType.Time>
  | PlayingAnimationT<TransitionType.Finished>;

export default class AnimationSequence {
  private sequence: SequenceAnimation[];

  private currIdx;
  private sprite: Sprite;
  private playingAnim: PlayingAnimation | null;
  private onAdvanceCb?: (next: string) => void;

  isFinished: boolean;

  constructor(
    sprite: Sprite,
    sequence: SequenceAnimation[],
    onAdvance?: (next: string) => void,
  ) {
    this.sprite = sprite;
    this.sequence = sequence;
    this.currIdx = 0;
    this.playingAnim = null;
    this.isFinished = false;
    this.onAdvanceCb = onAdvance;
  }

  static createAnim<T extends TransitionType>(config: {
    anim: string;
    options?: AnimationOptions;
    type: T;
    transition: TransitionCondition<T>;
  }): SequenceAnimationT<T> {
    return {
      type: config.type,
      anim: config.anim,
      options: config.options,
      transition: config.transition,
    };
  }

  hasStarted(): boolean {
    return this.playingAnim !== null;
  }

  start(): void {
    if (this.hasStarted())
      throw new Error(
        "Animation sequence is already started. Call finish() to end it.",
      );
  
    this.sprite.currentAnimationSequence = this;
    this.isFinished = false;
    this.currIdx = 0;
    this.initPlayingAnimation();
  }

  finish(): void {
    if (!this.hasStarted())
      throw new Error("The animation sequence is not started");
    if (!this.isFinished)
      throw new Error("The animation sequence is not finished");

    this.sprite.currentAnimationSequence = null;
    this.playingAnim = null;
  }

  getCurrentAnimation(): { name: string; index: number } {
    return { name: this.sequence[this.currIdx]?.anim, index: this.currIdx };
  }

  update(dt: number): void {
    if (this.playingAnim === null)
      throw new Error("Animation sequence has not been initialized.");
    if (this.isFinished) return;

    const playingAnim = this.playingAnim;

    switch (playingAnim.type) {
      case TransitionType.Distance: {
        const targetDx = playingAnim.anim.transition.dx;
        const targetDy = playingAnim.anim.transition.dy;
        const spriteDx = this.sprite.pos.x - playingAnim.x;
        const spriteDy = this.sprite.pos.y - playingAnim.y;

        const hasReached =
          (targetDx === 0 ||
            (Math.sign(targetDx) === Math.sign(spriteDx) &&
              Math.abs(spriteDx) >= Math.abs(targetDx))) &&
          (targetDy === 0 ||
            (Math.sign(targetDy) === Math.sign(spriteDy) &&
              Math.abs(spriteDy) >= Math.abs(targetDy)));

        if (hasReached) {
          this.currIdx++;
          if (this.currIdx === this.sequence.length) {
            this.isFinished = true;
          } else {
            this.initPlayingAnimation();
          }
        }
        break;
      }
      case TransitionType.Time:
        playingAnim.duration += dt;

        if (playingAnim.duration >= playingAnim.anim.transition.duration) {
          this.currIdx++;
          if (this.currIdx === this.sequence.length) {
            this.isFinished = true;
          } else {
            this.initPlayingAnimation();
          }
        }
        break;
      case TransitionType.Finished:
        if (this.sprite.animations.currentAnimation !== playingAnim.anim.anim) {
          this.currIdx++;
          if (this.currIdx === this.sequence.length) {
            this.isFinished = true;
          } else {
            this.initPlayingAnimation();
          }
        }
        break;
    }
  }

  private initPlayingAnimation(): void {
    const anim = this.sequence[this.currIdx];

    switch (anim.type) {
      case TransitionType.Distance:
        this.playingAnim = {
          type: TransitionType.Distance,
          anim,
          x: this.sprite.pos.x,
          y: this.sprite.pos.y,
        };

        break;
      case TransitionType.Time:
        this.playingAnim = { type: TransitionType.Time, anim, duration: 0 };
        break;
      case TransitionType.Finished:
        this.playingAnim = { type: TransitionType.Finished, anim };
        break;
    }

    this.sprite.animations.play(anim.anim, anim.options);
    if (this.onAdvanceCb) this.onAdvanceCb(anim.anim);
  }
}
