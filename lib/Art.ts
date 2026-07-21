import AudioPlayer from "./AudioPlayer.ts";
import ImagesManager from "./ImagesManager.ts";
import Scene from "./Scene.ts";

export type ArtConfig = {
  width: number;
  height: number;
  tileSize?: number;
  play: Scene;
  pause: Scene;
  canvas?: string;
  frameRate?: number;
  displayGrid: boolean;
  services?: Record<string, any>;
};

const FRAME_RATE_DEFAULT = 60;
const CANVAS_SELECTOR_DEFAULT = "#art-canvas";
const DEFAULT_TILE_SIZE = 16;

export default class Art {
  keys: {
    up: boolean;
    right: boolean;
    down: boolean;
    left: boolean;
    space: boolean;
  };

  isPlaying: boolean;
  images: ImagesManager;
  audio: AudioPlayer;
  config: ArtConfig;
  ctx!: CanvasRenderingContext2D;
  services: Record<string, any> | null;

  width: number;
  height: number;
  tileSize: number;
  displayGrid: boolean;
  frameRate: number;
  startTime: Date | null;
  elapsedAcc: number;
  elapsedPrev: number;

  #currId: number;

  constructor(config: ArtConfig) {
    this.images = new ImagesManager();
    this.audio = new AudioPlayer();
    this.isPlaying = false;
    this.config = config;
    this.elapsedAcc = 0;
    this.elapsedPrev = 0;
    this.width = config.width;
    this.height = config.height;
    this.tileSize = config.tileSize ?? DEFAULT_TILE_SIZE;
    this.displayGrid = config.displayGrid ?? false;
    this.services = config.services ?? null;

    this.keys = {
      up: false,
      right: false,
      down: false,
      left: false,
      space: false,
    };
    this.frameRate = config.frameRate ?? FRAME_RATE_DEFAULT;
    this.startTime = null;
    this.#currId = -1;
  }

  enterFullScreen(): void {
    const body = document.querySelector("body");
    if (!body) throw new Error("body not found");

    if (!document.fullscreenElement) {
      body.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  getId(): number {
    this.#currId++;
    return this.#currId;
  }

  async start(): Promise<void> {
    await this.#init();
    this.#privatePlay(this.ctx);
  }

  async play(): Promise<void> {
    this.audio.onOffSwitch();
    this.config.play.start();
    this.config.pause.stop();
    this.isPlaying = true;
  }

  async pause(): Promise<void> {
    this.audio.onOffSwitch();
    this.config.pause.start();
    this.config.play.stop();
    this.isPlaying = false;
  }

  async #privatePlay(
    ctx: CanvasRenderingContext2D,
    elapsed = 0,
  ): Promise<void> {
    try {
      this.elapsedAcc += elapsed - this.elapsedPrev;

      if (this.elapsedAcc >= 1000 / this.frameRate) {
        const currentTransform = ctx.getTransform();
        ctx.clearRect(
          0 - currentTransform.e,
          0 - currentTransform.f,
          this.width,
          this.height,
        );

        if (this.isPlaying) {
          this.config.play.update(elapsed);
          this.config.play.draw(ctx);

          if (this.displayGrid) {
            this.#drawGrid(
              ctx,
              this.height / this.tileSize,
              this.width / this.tileSize,
              this.tileSize,
              "white",
            );
          }
        } else {
          this.config.pause.update(elapsed);
          this.config.pause.draw(ctx);
        }

        this.elapsedAcc = 0;
      }

      this.elapsedPrev = elapsed;
    } catch (e) {
      if (this.startTime) {
        const { hours, minutes, seconds } = diffHMS(new Date(), this.startTime);
        console.log(`Time since start ${hours}:${minutes}:${seconds}`);
      }
      console.error(e);
      await this.pause();
    }

    requestAnimationFrame((t) => this.#privatePlay(ctx, t));
  }

  async #init(): Promise<void> {
    this.startTime = new Date();
    const ctx = this.#initCanvas(this.config.canvas ?? CANVAS_SELECTOR_DEFAULT);

    this.config.play.art = this;
    this.config.pause.art = this;

    await this.config.play.init();
    await this.config.pause.init();

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) this.keys.up = true;
      if (["arrowright", "d"].includes(key)) this.keys.right = true;
      if (["arrowdown", "s"].includes(key)) this.keys.down = true;
      if (["arrowleft", "a"].includes(key)) this.keys.left = true;
      if (key === " ") this.keys.space = true;
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) this.keys.up = false;
      if (["arrowright", "d"].includes(key)) this.keys.right = false;
      if (["arrowdown", "s"].includes(key)) this.keys.down = false;
      if (["arrowleft", "a"].includes(key)) this.keys.left = false;
      if (key === " ") this.keys.space = false;
    });

    this.ctx = ctx;
  }

  #initCanvas(selector: string): CanvasRenderingContext2D {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    if (!canvas) throw new Error("canvas is null");

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ctx is null");

    canvas.width = this.width;
    canvas.height = this.height;
    ctx.imageSmoothingEnabled = true;

    return ctx;
  }

  #drawGrid(
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
}

function diffHMS(date1: Date, date2: Date) {
  let diff = Math.abs(date2.getTime() - date1.getTime());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * 1000 * 60;
  const seconds = Math.floor(diff / 1000);
  return { hours, minutes, seconds };
}
