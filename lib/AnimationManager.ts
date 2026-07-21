import type Sprite from "./objects/Sprite.js";

export type AnimationConfig = {
    frames: string;           // spritesheet image key
    frameRate: number;        // ms per frame
    numberOfFrames: number;   // total frames
    startIdx?: number;        // where in spritesheet to start
    loop: boolean;            // should animation loop
};

type PlayingAnimation = {
    key: string;
    config: AnimationConfig;
    frameCount: number;
    updateCount: number;
    loopCount: number;
    overlay?: { frames: string; startIdx: number };
};

export default class AnimationManager {
    sprite: Sprite;
    animations: Map<string, AnimationConfig>;
    playingAnimation: PlayingAnimation | null;

    constructor(sprite: Sprite) {
        this.sprite = sprite;
        this.animations = new Map();
        this.playingAnimation = null;
    }

    create(key: string, config: AnimationConfig) {
        if (config.startIdx === undefined) config.startIdx = 0;
        this.animations.set(key, config);
    }

    play(key: string, overlay?: { frames: string; startIdx: number }) {
        const animation = this.animations.get(key);

        if (!animation) throw new AnimationNotAddedError(key);

        this.playingAnimation = {
            key,
            config: animation,
            overlay,
            frameCount: 0,
            updateCount: 0,
            loopCount: 0,
        };
    }

    stop(key: string) {
        if (this.playingAnimation && key === this.playingAnimation.key) {
            this.playingAnimation = null;
        }
    }

    loopCount(): number {
        return this.playingAnimation?.loopCount ?? 0;
    }

    isPlaying(key: string): boolean {
        return this.playingAnimation?.key === key;
    }

    update(): void {
        if (!this.playingAnimation) return;

        if(this.sprite.scene.art === null) throw new Error("art is not set on sprite's scene object");

        const updatesPerFrame = Math.floor(
            this.playingAnimation.config.frameRate / (1000 / this.sprite.scene.art.frameRate)
        );

        if (this.playingAnimation.updateCount >= updatesPerFrame) {
            if (this.playingAnimation.frameCount >= this.playingAnimation.config.numberOfFrames - 1) {
                if (!this.playingAnimation.config.loop) {
                    this.playingAnimation = null;
                    return;
                } else {
                    this.playingAnimation.frameCount = 0;
                    this.playingAnimation.loopCount++;
                }
            } else {
                this.playingAnimation.frameCount++;
            }

            this.playingAnimation.updateCount = 0;
        }

        this.playingAnimation.updateCount++;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.playingAnimation) return;

        const sprite = this.sprite;
        const anim = this.playingAnimation;

        if(sprite.scene.art === null) throw new Error("art instance is not set on scene object");

        const image = sprite.scene.art.images.get(anim.config.frames);
        if (!image) return;

        ctx.drawImage(
            image,
            (anim.config.startIdx! + anim.frameCount) * sprite.width,
            0,
            sprite.width,
            sprite.height,
            sprite.pos.x,
            sprite.pos.y,
            sprite.width,
            sprite.height
        );

        if (anim.overlay) {
            const overlayImage = sprite.scene.art.images.get(anim.overlay.frames);
            if (!overlayImage) return;

            ctx.drawImage(
                overlayImage,
                (anim.overlay.startIdx + anim.frameCount) * sprite.width,
                0,
                sprite.width,
                sprite.height,
                sprite.pos.x,
                sprite.pos.y,
                sprite.width,
                sprite.height
            );
        }
    }
}

class AnimationNotAddedError extends Error {
    constructor(key: string) {
        super(`Animation: ${key} not added.`);
    }
}