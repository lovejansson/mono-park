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
  displayGrid?: boolean;
  gridColor?: string;
  services?: Record<string, any>;
  loading?: string;
  onError?: (e: Error) => void;
};

const CONTAINER_SELECTOR_DEFAULT = "#art-container";

export default class Art {
  spritesheets!: SpritesheetsManager;
  images: ImagesManager;
  audio: AudioPlayer;
  services: Record<string, any> | null;

  width: number;
  height: number;
  tileSize: number;
  displayGrid: boolean;
  gridColor: string;

  isPlaying: boolean;

  private config: ArtConfig;
  private currId: number;
  private renderer!: Renderer;
  private onErrorCb: ((e: Error) => void) | null;

  constructor(config: ArtConfig) {
    this.images = new ImagesManager();
    this.renderer = new Renderer(this, config, this.onRenderError.bind(this));

    this.spritesheets = new SpritesheetsManager();
    this.audio = new AudioPlayer();

    this.isPlaying = false;

    this.config = config;
    this.width = config.width;
    this.height = config.height;
    this.tileSize = config.tileSize;
    this.displayGrid = config.displayGrid ?? false;
    this.gridColor = config.gridColor ?? "white";
    this.services = config.services ?? null;
    this.onErrorCb = config.onError ?? null;

    this.currId = -1;
  }

  getId(): number {
    this.currId++;
    return this.currId;
  }

  async init(): Promise<void> {
    if (this.config.loading) {
      const loadingEl = document.querySelector(this.config.loading);

      if (loadingEl !== null) {
        loadingEl.classList.remove("hidden");
      }
    }

    this.config.play.art = this;

    await this.config.play.init();

    if (this.config.pause !== undefined) {
      this.config.pause.art = this;
      await this.config.pause?.init();
    }

    await this.renderer.init(
      this.config.container ?? CONTAINER_SELECTOR_DEFAULT,
    );

    this.renderer.start();

    if (this.config.pause) {
      this.config.pause.start();
    } else {
      this.config.play.start();
    }

    if (this.config.loading) {
      const loadingEl = document.querySelector(this.config.loading);

      if (loadingEl !== null) {
        loadingEl.classList.add("hidden");
      }
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

  private onRenderError(
    e: Error,
    runtime: { hours: number; minutes: number; seconds: number },
  ): void {

    console.error(
      `Art error after ${runtime.hours}:${runtime.minutes}:${runtime.seconds}`,
      e,
    );

    if (this.audio.onoff) {
      this.audio.onOffSwitch();
    }

    if (this.onErrorCb) this.onErrorCb(e);
    else throw e;
  }
}
