import Art, { type ArtConfig } from "./Art";
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
  private pauseScene: Scene;

  constructor(art: Art, config: ArtConfig) {
    this.ctx = null; // Is set in init();
    this.art = art;
    this.playScene = config.play;
    this.pauseScene = config.pause;
    this.elapsedPrev = 0;
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

  run(elapsed: number = 0): void {
    if (this.ctx === null) throw new RendererUnInitialized();

    const dt = elapsed - this.elapsedPrev;
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
      this.playScene.preUpdate(dt);

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
    } else {
      this.updateSceneAnimations(this.pauseScene, dt);
      this.pauseScene.preUpdate(dt);

      this.pauseScene.update(dt);

      this.drawSceneCanvasObjects(this.pauseScene);
    }

    this.elapsedPrev = elapsed;

    requestAnimationFrame((elapsed) => this.run(elapsed));
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
    const offset = 0.5;

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
      obj.animations.draw(this.ctx);
    }
  }
}

export class RendererUnInitialized extends Error {
  constructor() {
    super(`Renderer has not been initialized`);
  }
}
