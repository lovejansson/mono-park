import AudioPlayer from "./AudioPlayer.ts";
import Scene from "./Scene.ts";
import SpritesheetsManager from "./SpritesheetsManager.ts";
import ImagesManager from "./ImagesManager.ts";
import Renderer from "./Renderer.ts";

export type ArtConfig = {
  width: number;
  height: number;
  tileSize: number;
  play: Scene;
  pause?: Scene;
  container?: string;
  displayGrid: boolean;
  gridColor?: string;
  services?: Record<string, any>;
  scale?: "hd" | "4k";
};

const CONTAINER_SELECTOR_DEFAULT = "#art-container";

export default class Art {
  keys: {
    up: boolean;
    right: boolean;
    down: boolean;
    left: boolean;
    space: boolean;
  };

  spritesheets!: SpritesheetsManager;
  images: ImagesManager;
  audio: AudioPlayer;
  services: Record<string, any> | null;

  width: number;
  height: number;
  tileSize: number;
  displayGrid: boolean;
  gridColor: string;
  scale: "hd" | "4k" | null;

  isPlaying: boolean;

  private config: ArtConfig;
  startTime: Date | null;
  private currId: number;
  private renderer!: Renderer;

  constructor(config: ArtConfig) {
    this.images = new ImagesManager();
    this.renderer = new Renderer(this, config);

    this.spritesheets = new SpritesheetsManager();
    this.audio = new AudioPlayer();

    this.isPlaying = false;

    this.config = config;
    this.width = config.width;
    this.height = config.height;
    this.tileSize = config.tileSize;
    this.displayGrid = config.displayGrid ?? false;
    this.gridColor = config.gridColor ?? "white";
    this.scale = config.scale ?? null;
    this.services = config.services ?? null;

    this.keys = {
      up: false,
      right: false,
      down: false,
      left: false,
      space: false,
    };

    this.startTime = null;
    this.currId = -1;
  }

  getId(): number {
    this.currId++;
    return this.currId;
  }

  async init(): Promise<void> {
    this.startTime = new Date();

    this.config.play.art = this;
    await this.config.play.init();

    if (this.config.pause !== undefined) {
      this.config.pause.art = this;
      await this.config.pause?.init();
    }

    await this.renderer.init(
      this.config.container ?? CONTAINER_SELECTOR_DEFAULT,
    );

    addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) this.keys.up = true;
      if (["arrowright", "d"].includes(key)) this.keys.right = true;
      if (["arrowdown", "s"].includes(key)) this.keys.down = true;
      if (["arrowleft", "a"].includes(key)) this.keys.left = true;
      if (key === " ") this.keys.space = true;
    });

    addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) this.keys.up = false;
      if (["arrowright", "d"].includes(key)) this.keys.right = false;
      if (["arrowdown", "s"].includes(key)) this.keys.down = false;
      if (["arrowleft", "a"].includes(key)) this.keys.left = false;
      if (key === " ") this.keys.space = false;
    });

    try {
      this.renderer.run();
    } catch (e) {
      if (this.startTime) {
        const { hours, minutes, seconds } = diffHMS(new Date(), this.startTime);
        this.audio.beep();
        console.log(`Time since start ${hours}:${minutes}:${seconds}`);
      }

      if (this.audio.onoff) {
        this.audio.onOffSwitch();
      }
      console.error(e);
    }

    if (this.config.pause) {
      this.config.pause.start();
    } else {
      this.config.play.start();
    }
  }

  async play(): Promise<void> {
    if (!this.audio.onoff) this.audio.onOffSwitch();

    this.isPlaying = true;
    this.config.play.start();

    // If we have a special pause screen, stop the pause screen
    if (this.config.pause) {
      this.config.pause.stop();
    }
  }

  async pause(): Promise<void> {
    if (this.audio.onoff) this.audio.onOffSwitch();

    this.isPlaying = false;
    this.config.play.stop();
    // If we have a special pause screen, start it
    if (this.config.pause) {
      this.config.pause.start();
    }
  }
}

export function diffHMS(date1: Date, date2: Date) {
  let diff = Math.abs(date2.getTime() - date1.getTime());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * 1000 * 60;
  const seconds = Math.floor(diff / 1000);
  return { hours, minutes, seconds };
}
