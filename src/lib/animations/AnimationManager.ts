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
  reverse?: boolean;
};
export type OverlayOptions = {
  name: string;
  dx?: number;
  dy?: number;
  drawBehind?: boolean;
  drawOnTop?: boolean;
};

type OverlayState = {
  name: string;
  anim: Animation;
  dx: number;
  dy: number;
  drawBehind: boolean;
  drawOnTop: boolean;
};

type PlayingState = {
  name: string;
  anim: Animation;
  frameIndex: number;
  elapsed: number;
  loopCount: number;
  repeat: number | boolean;
  overlay?: OverlayState;
  reverse?: boolean;
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
  loopCount: number,
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
  registerSpritesheet(key: string, options?: RegisterSpritesheetOptions): void {
    const sheet = this.sprite.scene.art!.spritesheets.get(key) as Spritesheet;

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

    let overlay = undefined;

    if (options?.overlay) {
      const overlayAnim = this.animations.get(options.overlay.name);

      if (overlayAnim === undefined)
        throw new AnimationNotAddedError(options.overlay.name);

      overlay = {
        name: options.overlay.name,
        anim: overlayAnim,
        dx: options.overlay.dx ?? 0,
        dy: options.overlay.dy ?? 0,
        drawBehind: options.overlay.drawBehind ?? false,
        drawOnTop: options.overlay.drawOnTop ?? false,
      };
    }

    const firstFrameIdx = options?.reverse ? anim.frames.length - 1 : 0;

    this.playing = {
      name: name,
      anim,
      frameIndex: firstFrameIdx,
      elapsed: 0,
      loopCount: 0,
      repeat,
      reverse: options?.reverse,
      overlay: overlay,
    };

    if (this.onFrameChange) {
      this.onFrameChange(name, firstFrameIdx, anim.frames.length, 0);
    }
  }

  stop(name: string): void {
    if (this.playing?.name === name) {
      this.playing = null;
      this.currentAnimation = null;
    }
  }

  update(dt: number): void {
    if (this.playing === null) return;

    const frame = this.playing.anim.frames[this.playing.frameIndex];

    this.playing.elapsed += dt;

    if (this.playing.elapsed < frame.duration) return;

    this.playing.elapsed -= frame.duration;

    if (this.playing.reverse) {
      this.playing.frameIndex--;
      if (this.playing.frameIndex > -1) {
        if (this.onFrameChange) {
          this.onFrameChange(
            this.playing.name,
            this.playing.frameIndex,
            this.playing.anim.frames.length,
            this.playing.loopCount,
          );
        }
        return;
      }
    } else {
      this.playing.frameIndex++;
      if (this.playing.frameIndex < this.playing.anim.frames.length) {
        if (this.onFrameChange) {
          this.onFrameChange(
            this.playing.name,
            this.playing.frameIndex,
            this.playing.anim.frames.length,
            this.playing.loopCount,
          );
        }
        return;
      }
    }

    const { repeat } = this.playing;

    if (repeat === false) {
      const name = this.playing.name;
      this.playing = null;
      this.currentAnimation = null;
      if (this.onComplete) this.onComplete(name);
    } else if (typeof repeat === "number") {
      this.playing.loopCount++;

      if (this.playing.loopCount === repeat) {
        const name = this.playing.name;
        this.playing = null;
        this.currentAnimation = null;
        if (this.onComplete) this.onComplete(name);
      } else {
        const firstFrameIdx = this.playing.reverse
          ? this.playing.anim.frames.length - 1
          : 0;
        this.playing.frameIndex = firstFrameIdx;
        if (this.onLoop) this.onLoop(this.playing.name, this.playing.loopCount);
        if (this.onFrameChange) {
          this.onFrameChange(
            this.playing.name,
            firstFrameIdx,
            this.playing.anim.frames.length,
            this.playing.loopCount,
          );
        }
      }
    } else {
      this.playing.loopCount++;

      const firstFrameIdx = this.playing.reverse
        ? this.playing.anim.frames.length - 1
        : 0;
      this.playing.frameIndex = firstFrameIdx;
      if (this.onLoop) this.onLoop(this.playing.name, this.playing.loopCount);
      if (this.onFrameChange) {
        this.onFrameChange(
          this.playing.name,
          firstFrameIdx,
          this.playing.anim.frames.length,
          this.playing.loopCount,
        );
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.playing === null) return;

    const frame = this.playing.anim.frames[this.playing.frameIndex];

    const image = this.sprite.scene.art!.images.get(
      this.playing.anim.spritesheet,
    );

    if (this.playing.overlay?.drawBehind) {
      this.drawOverlay(ctx, this.playing.overlay, this.playing.frameIndex);
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
      this.drawOverlay(ctx, this.playing.overlay, this.playing.frameIndex);
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    overlay: OverlayState,
    mainFrameIndex: number,
  ): void {
    if (this.playing === null) return;

    // Currently the overlay animations frames are allowed to not sync with the main animation bc sometimes there is just an overlay image which repeats... might have to provide separate update logic for overlays in the future.
    const frameIdx = Math.min(mainFrameIndex, overlay.anim.frames.length - 1);

    const frame = overlay.anim.frames[frameIdx];
    const image = this.sprite.scene.art!.images.get(overlay.anim.spritesheet);

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

  hasPlayingAnimation(): boolean {
    return this.currentAnimation !== null;
  }

  isPlaying(name: string): boolean {
    return this.currentAnimation === name;
  }

  getPlaying(): string | null {
    return this.currentAnimation;
  }

  isLastFrame(): boolean {
    if (!this.playing) return false;
    const lastFrame = this.playing.reverse
      ? 0
      : this.playing.anim.frames.length - 1;

    return this.playing.frameIndex === lastFrame;
  }

  getFrameCount(name: string): number {
    const anim = this.animations.get(name);
    if (anim === undefined) throw new AnimationNotAddedError(name);
    return anim.frames.length;
  }

  get loopCount(): number {
    if (this.playing === null) throw new Error("No animation is playing");
    return this.playing.loopCount;
  }
}

class AnimationNotAddedError extends Error {
  constructor(name: string) {
    super(`Animation: ${name} not added.`);
  }
}
