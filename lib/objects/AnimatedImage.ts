import ArtObject from "./ArtObject.ts";
import Scene from "../Scene.ts";
import type {
    AsepriteFrameData,
    AsepriteJSON
} from "../types.js"; // assume you define these in types.ts

export default class AnimatedImage extends ArtObject {
    image: string; 
    frames: AsepriteFrameData[];
    currentFrameIdx: number;
    elapsed: number;

    constructor(scene: Scene, spritesheet: string, config: AsepriteJSON) {
        super(scene);
        this.image = spritesheet;
        this.frames = Object.values(config.frames);
        this.currentFrameIdx = 0;
        this.elapsed = 0;
    }

    update(elapsed: number): void {
        const frame = this.frames[this.currentFrameIdx];

        if (elapsed - this.elapsed >= frame.duration) {
            if (this.currentFrameIdx === this.frames.length - 1) {
                this.currentFrameIdx = 0;
            } else {
                this.currentFrameIdx++;
            }
            this.elapsed = elapsed;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const frame = this.frames[this.currentFrameIdx];
        if(this.scene.art === null) throw new Error("art is not set on scene object");
        const img = this.scene.art.images.get(this.image);

        if (!img) return; // safety check

        const { x, y, w, h } = frame.frame;
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    }
}