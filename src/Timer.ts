export default class Timer {
  isStopped: boolean;

  constructor() {
    this.isStopped = false;
  }

  stop() {
    this.isStopped = true;
  }

  start(ms: number) {
    setTimeout(() => {
      this.isStopped = true;
    }, ms);
  }
}

export const ONE_MINUTE = 1000 * 60;
export const FIVE_MINUTES = 1000 * 60 * 5;
export const TEN_MINUTES = 1000 * 60 * 10;
export const THIRTY_SECONDS = 1000 * 30;
export const TEN_SECONDS = 1000 * 10;
