import { cellToPos } from "./lib";
import type { Cell } from "./lib/types";
import { type StrollSpot } from "./Play";
import type Play from "./Play";

type WalkStateInactive = {
  isWalking: false;
};

type WalkStateActive = {
  isWalking: true;
  leader: number;
};

type WalkState = WalkStateActive | WalkStateInactive;

export default class Group {
  private static readonly BLOCK_PATH_EDGE_OFFSET = 4;

  private scene: Play;
  private walk: WalkState;
  private strollSpots: StrollSpot[];
  private currStrollSpotIdx: number;

  constructor(scene: Play, strollSpots: StrollSpot[]) {
    this.scene = scene;
    this.walk = { isWalking: false };
    this.strollSpots = strollSpots;
    this.currStrollSpotIdx = 0;

  }

  getStrollSpot(): StrollSpot {
    return this.strollSpots[this.currStrollSpotIdx];
  }

  nextStrollSpot(): void {
    if (this.currStrollSpotIdx === this.strollSpots.length - 1) {
      this.currStrollSpotIdx = 0;
    } else {
      this.currStrollSpotIdx++;
    }
  }

  startWalk(leader: number): void {

    this.walk = {
      isWalking: true,
      leader,
    };
  }

  stopWalk(): void {

    this.walk = { isWalking: false };
  }

  isWalking(): boolean {
    return this.walk.isWalking;
  }

  getWalkState(): WalkState {
    return this.walk;
  }

  getLeader(): number {
    if (!this.walk.isWalking) throw new Error("No walk is active");
    return this.walk.leader;
  }

  getActiveWalkState(): WalkStateActive | null {
    return this.walk.isWalking ? this.walk : null;
  }

  private getMiddlePathCells(path: Cell[]): Cell[] {
    const offset = Group.BLOCK_PATH_EDGE_OFFSET;

    if (path.length <= offset * 2) {
      return [];
    }

    return path.slice(offset, path.length - offset);
  }
}
