import Art, { diffHMS, type ArtConfig } from "./Art";
import StaticImage from "./objects/StaticImage";
import Sprite from "./objects/Sprite";
import Scene from "./Scene";

export function scaleToSize(
  scale: "hd" | "4k" | null,
): { width: number; height: number } | null {
  if (scale === "hd") return { width: 1920, height: 1080 };
  if (scale === "4k") return { width: 3840, height: 2160 };
  return null;
}

export default class Renderer {
  private ctx: CanvasRenderingContext2D | null;
  private art: Art;
  private elapsedPrev: number;
  private playScene: Scene;
  private pauseScene?: Scene;
  private isRunning: boolean;
  private animationFrameID: number;

  constructor(art: Art, config: ArtConfig) {
    this.ctx = null; // Is set in init();
    this.art = art;
    this.playScene = config.play;
    this.pauseScene = config.pause;
    this.elapsedPrev = 0;
    this.isRunning = false;
    this.animationFrameID = -1;
  }

  getImageData(): ImageData {
    if (this.ctx === null) throw new RendererUnInitialized();

    return this.ctx.getImageData(
      0,
      0,
      this.ctx.canvas.width,
      this.ctx.canvas.height,
    );
  }

  async init(containerSelector: string): Promise<void> {
    const container = document.querySelector<HTMLElement>(containerSelector);

    if (container === null) throw new Error("Art container is null");

    const canvas = document.createElement("canvas");

    canvas.width = this.art.width;
    canvas.height = this.art.height;

    this.ctx = canvas.getContext("2d");

    if (this.ctx === null) throw new Error("ctx is null");

    this.ctx.imageSmoothingEnabled = true;

    const scaled = scaleToSize(this.art.scale);

    canvas.style.width = scaled ? `${scaled.width}px` : `100%`;
    canvas.style.height = scaled ? `${scaled.height}px` : `100%`;

    canvas.style.imageRendering = "pixelated";

    container.appendChild(canvas);
  }

  start(): void {
    if (this.isRunning) {
      console.warn("Renderer is already running!");
    }

    this.isRunning = true;
    this.elapsedPrev = 0;

    this.animationFrameID = requestAnimationFrame((elapsed) =>
      this.run(elapsed),
    );
  }

  stop(): void {
    this.isRunning = false;

    if (this.animationFrameID !== -1) {
      cancelAnimationFrame(this.animationFrameID);
      this.animationFrameID = -1;
    }
  }

  run(elapsed: number = 0): void {
    if (!this.isRunning) throw new Error("Renderer is not started");
    try {
      if (this.ctx === null) throw new RendererUnInitialized();

      let dt = elapsed - this.elapsedPrev;
      // If the tab is in the background the browser will throttle or pause this RAF function so set the delta to something normal here.
      if (dt > 500) {
        dt = 16;
      }

      const currentTransform = this.ctx.getTransform();
      this.ctx.clearRect(
        0 - currentTransform.e,
        0 - currentTransform.f,
        this.art.width,
        this.art.height,
      );

      /**
       *
       * 1. Update animations for all objects
       * 2. Update scene and logic for all objects in scene
       * 3. Draw the scene and all objects
       */

      if (this.art.isPlaying) {
        this.updateSceneAnimations(this.playScene, dt);
        this.playScene.update(dt);

        this.drawSceneCanvasObjects(this.playScene);
        if (this.art.displayGrid) {
          this.drawGrid(
            this.ctx,
            this.art.height / this.art.tileSize,
            this.art.width / this.art.tileSize,
            this.art.tileSize,
            this.art.gridColor,
          );
        }
        if (this.art.startTime) {
          const { hours, minutes, seconds } = diffHMS(
            new Date(),
            this.art.startTime,
          );
          if (minutes !== 0 && minutes % 5 === 0 && seconds === 0) {
            this.art.audio.beep();
            console.log(`Time since start ${hours}:${minutes}:${seconds}`);
          }
        }
      } else {
        if (this.pauseScene !== undefined) {
          this.updateSceneAnimations(this.pauseScene, dt);
          this.pauseScene.update(dt);

          this.drawSceneCanvasObjects(this.pauseScene);
        } else {
          // Draw play scene without the updates of it

          if (elapsed < 10) {
            this.updateSceneAnimations(this.playScene, dt);
            this.playScene.update(dt);
          }
          this.drawSceneCanvasObjects(this.playScene);
          if (this.art.displayGrid) {
            this.drawGrid(
              this.ctx,
              this.art.height / this.art.tileSize,
              this.art.width / this.art.tileSize,
              this.art.tileSize,
              this.art.gridColor,
            );
          }
        }
      }

      this.elapsedPrev = elapsed;
      this.animationFrameID = requestAnimationFrame((elapsed) =>
        this.run(elapsed),
      );
    } catch (e) {
      if (this.art.startTime) {
        const { hours, minutes, seconds } = diffHMS(
          new Date(),
          this.art.startTime,
        );
        // this.art.audio.beep();
        console.log(`Time since start ${hours}:${minutes}:${seconds}`);
      }

      if (this.art.audio.onoff) {
        this.art.audio.onOffSwitch();
      }

      console.error(e);

      // Lägg in dialog för reload av art...
    }
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    rows: number,
    cols: number,
    cellSize: number,
    strokeColor = "black",
  ) {
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;

    const offset = 0.5;
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.moveTo(c * cellSize + offset, r * cellSize + offset);
        ctx.lineTo((c + 1) * cellSize + offset, r * cellSize + offset);
        ctx.lineTo((c + 1) * cellSize + offset, (r + 1) * cellSize + offset);
        ctx.lineTo(c * cellSize + offset, (r + 1) * cellSize + offset);
        ctx.lineTo(c * cellSize + offset, r * cellSize + offset);
      }
    }
    ctx.stroke();
    ctx.imageSmoothingEnabled = false;
    ctx.font = "8px Source Code Pro";
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < this.art.height / this.art.tileSize; ++r) {
      ctx.fillText(r.toString(), 0, r * this.art.tileSize);
    }

    for (let c = 0; c < this.art.width / this.art.tileSize; ++c) {
      ctx.fillText(c.toString(), c * this.art.tileSize, this.art.height);
    }

    ctx.imageSmoothingEnabled = false;
  }

  private updateSceneAnimations(scene: Scene, dt: number): void {
    for (const obj of scene.objects) {
      if (obj instanceof Sprite) {
        obj.animations.update(dt);
      }
    }
  }

  private drawSceneCanvasObjects(scene: Scene): void {
    for (const obj of scene.objects) {
      this.drawCanvasObject(obj);
    }
  }

  private drawCanvasObject(obj: unknown): void {
    if (this.ctx === null) throw new RendererUnInitialized();

    if (obj instanceof StaticImage) {
      const img = this.art.images.get(obj.image);
      if (!img) return;
      this.ctx.drawImage(img, obj.pos.x, obj.pos.y);
      return;
    } else if (obj instanceof Sprite) {
      if (obj.isVisible) {
        obj.animations.draw(this.ctx);
      }
    }
  }
}

export class RendererUnInitialized extends Error {
  constructor() {
    super(`Renderer has not been initialized`);
  }
}
