export default class Timer {
  private elapsed = 0;
  private duration = 0;
  private cb: (() => void) | null = null;
  isRunning = false;
  isStarted = false;

  start(duration: number, cb?: () => void) {
    this.duration = duration;
    this.elapsed = 0;
    this.isStarted = true;
    this.isRunning = true;

    if (cb !== undefined) {
      this.cb = cb;
    }
  }

  update(dt: number) {
    if (!this.isRunning) return;

    this.elapsed += dt;

    if (this.elapsed >= this.duration) {
      this.isRunning = false;
      if (this.cb !== null) {
        this.cb();
      }
    }
  }

  stop(): void {
    this.isStarted = false;
    this.isRunning = false;
  }

  get isStopped(): boolean {
    return this.isStarted === false && this.isRunning === false;
  }
}

export const ONE_MINUTE = 1000 * 60;
export const FIVE_MINUTES = 1000 * 60 * 5;
export const TEN_MINUTES = 1000 * 60 * 10;
export const THIRTY_SECONDS = 1000 * 30;
export const ONE_SECOND = 1000;
export const TEN_SECONDS = 1000 * 10;
export const THREE_SECONDS = 1000;
