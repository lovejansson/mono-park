import type Sprite from "../objects/Sprite.ts";
import type { Spritesheet } from "../SpritesheetsManager.ts";

type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  duration: number;
};

type Animation = {
  frames: Frame[];
  spritesheet: string;
};

export type AnimationOptions = {
  repeat?: number | boolean; // true = loop forever, number = fixed repeat count, false = play once
  overlay?: OverlayOptions;
};
export type OverlayOptions = {
  name: string;
  dx?: number;
  dy?: number;
  drawBehind?: boolean;
  drawOnTop?: boolean;
};

type OverlayState = {
  animationKey: string;
  dx: number;
  dy: number;
  drawBehind: boolean;
  drawOnTop: boolean;
};

type PlayingState = {
  animationKey: string;
  frameIndex: number;
  elapsed: number;
  loopCount: number;
  repeat: number | boolean;
  overlay?: OverlayState;
};

type RegisterSpritesheetOptions = {
  defaults?: AnimationDefaults;
  onFrameChange?: FrameChangeCallback | null;
  onLoop?: LoopCallback | null;
  onComplete?: CompleteCallback | null;
};

export type FrameChangeCallback = (
  anim: string,
  frame: number,
  totalFrames: number,
  loopCount: number
) => void;

export type LoopCallback = (animation: string, loopCount: number) => void;
export type CompleteCallback = (animation: string) => void;
export type AnimationDefaults = Record<string, { repeat: number | boolean }>;

export default class AnimationManager {
  private sprite: Sprite;
  private animations: Map<string, Animation>;
  private defaults: Map<string, { repeat: number | boolean }>;
  private playing: PlayingState | null;

  currentAnimation: string | null = null;
  onFrameChange: FrameChangeCallback | null = null;
  onLoop: LoopCallback | null = null;
  onComplete: CompleteCallback | null = null;

  constructor(sprite: Sprite) {
    this.sprite = sprite;
    this.animations = new Map();
    this.defaults = new Map();
    this.playing = null;
  }
 registerSpritesheet(
    key: string,
    options?: RegisterSpritesheetOptions,
  ): void {

    const sheet = this.sprite.scene.art!.spritesheets.get(
      key,
    ) as Spritesheet;

    for (const tag of sheet.data.meta.frameTags) {
      const frames: Frame[] = [];

      for (let i = tag.from; i <= tag.to; i++) {
        const f = sheet.data.frames[i];

        if (!f) {
          throw new Error(
            `Missing frame \"${i}\" in spritesheet \"${key}\" for tag \"${tag.name}\".`,
          );
        }

        frames.push({
          x: f.frame.x,
          y: f.frame.y,
          w: f.frame.w,
          h: f.frame.h,
          duration: f.duration,
        });
      }

      this.animations.set(tag.name, { frames, spritesheet: sheet.image });


      if (options?.defaults?.[tag.name] !== undefined) {
        this.defaults.set(tag.name, options?.defaults[tag.name]);
      }
    }
  }

  play(name: string, options?: AnimationOptions): void {
    const anim = this.animations.get(name);
    if (!anim) throw new AnimationNotAddedError(name);

    const repeat = options?.repeat ?? this.defaults.get(name)?.repeat ?? false;

    this.currentAnimation = name;

    this.playing = {
      animationKey: name,
      frameIndex: 0,
      elapsed: 0,
      loopCount: 0,
      repeat,
      overlay: options?.overlay
        ? {
            animationKey: options.overlay.name,
            dx: options.overlay.dx ?? 0,
            dy: options.overlay.dy ?? 0,
            drawBehind: options.overlay.drawBehind ?? false,
            drawOnTop: options.overlay.drawOnTop ?? false,
          }
        : undefined,
    };

    if (this.onFrameChange) {
      this.onFrameChange(name, 0, anim.frames.length, 0);
    }
  }

  stop(name: string): void {
    if (this.playing?.animationKey === name) {
      this.playing = null;
      this.currentAnimation = null;
    }
  }

  update(dt: number): void {
    if (this.playing === null) return;

    const anim = this.animations.get(this.playing.animationKey);
    if (!anim) return;

    const frame = anim.frames[this.playing.frameIndex];

    this.playing.elapsed += dt;

    if (this.playing.elapsed < frame.duration) return;

    this.playing.elapsed -= frame.duration;
    this.playing.frameIndex++;

    if (this.playing.frameIndex < anim.frames.length) {
      if (this.onFrameChange) {
        this.onFrameChange(
          this.playing.animationKey,
          this.playing.frameIndex,
          anim.frames.length,
          this.playing.loopCount
        );
      }
      return;
    }

    const { repeat } = this.playing;

    if (repeat === false) {
      const name = this.playing.animationKey;
      this.playing = null;
      this.currentAnimation = null;
      if (this.onComplete) this.onComplete(name);
    } else if (typeof repeat === "number") {
      this.playing.loopCount++;

      if (this.playing.loopCount >= repeat) {
        const name = this.playing.animationKey;
        this.playing = null;
        this.currentAnimation = null;
        if (this.onComplete) this.onComplete(name);
      } else {
        this.playing.frameIndex = 0;
        if (this.onLoop)
          this.onLoop(this.playing.animationKey, this.playing.loopCount);
        if (this.onFrameChange) {
          this.onFrameChange(this.playing.animationKey, 0, anim.frames.length,  this.playing.loopCount);
        }
      }
    } else {
      this.playing.loopCount++;

      this.playing.frameIndex = 0;
      if (this.onLoop)
        this.onLoop(this.playing.animationKey, this.playing.loopCount);
      if (this.onFrameChange) {
        this.onFrameChange(this.playing.animationKey, 0, anim.frames.length, this.playing.loopCount);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.playing === null) return;

    const anim = this.animations.get(this.playing.animationKey);
    if (!anim) return;

    const frameIndex = Math.min(
      this.playing.frameIndex,
      anim.frames.length - 1,
    );
    const frame = anim.frames[frameIndex];
    const image = this.sprite.scene.art!.images.get(anim.spritesheet);

    if (this.playing.overlay?.drawBehind) {
      this.drawOverlay(ctx, this.playing.overlay, frameIndex);
    }

    ctx.drawImage(
      image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      this.sprite.pos.x + this.sprite.drawOffset.x,
      this.sprite.pos.y + this.sprite.drawOffset.y,
      this.sprite.width,
      this.sprite.height,
    );

    if (this.playing.overlay?.drawOnTop) {
      this.drawOverlay(ctx, this.playing.overlay, frameIndex);
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    overlay: OverlayState,
    mainFrameIndex: number,
  ): void {
    const overlayAnim = this.animations.get(overlay.animationKey);
    if (!overlayAnim) return;

    const frameIndex = Math.min(mainFrameIndex, overlayAnim.frames.length - 1);
    const frame = overlayAnim.frames[frameIndex];
    const image = this.sprite.scene.art!.images.get(overlayAnim.spritesheet);

    ctx.drawImage(
      image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      this.sprite.pos.x + this.sprite.drawOffset.x + overlay.dx,
      this.sprite.pos.y + this.sprite.drawOffset.y + overlay.dy,
      this.sprite.width,
      this.sprite.height,
    );
  }

  getEstimatedDistanceForAnim(
    name: string,
    vel: { x: number; y: number },
  ): { x: number; y: number } {
    const frameCount = this.getFrameCount(name);
    return { x: frameCount * vel.x, y: frameCount * vel.y };
  }

  isPlaying(name: string): boolean {
    return this.currentAnimation === name;
  }

  getPlaying(): string | null {
    return this.currentAnimation;
  }

  isLastFrame(): boolean {
    if (!this.playing) return false;
    const anim = this.animations.get(this.playing.animationKey);
    return this.playing.frameIndex === (anim?.frames.length ?? 1) - 1;
  }

  getFrameCount(name: string): number {
    return this.animations.get(name)?.frames.length ?? 0;
  }

  get loopCount(): number {
    return this.playing?.loopCount ?? 0;
  }
}

class AnimationNotAddedError extends Error {
  constructor(name: string) {
    super(`Animation: ${name} not added.`);
  }
}
