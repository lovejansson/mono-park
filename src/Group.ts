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
  private blockedPath: Cell[] | null; // Keep on path blocked at a time to prevent the humans from going on a straight line

  constructor(scene: Play, strollSpots: StrollSpot[]) {
    this.scene = scene;
    this.walk = { isWalking: false };
    this.strollSpots = strollSpots;
    this.currStrollSpotIdx = 0;
    this.blockedPath = null;
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

  blockPath(path: Cell[]): void {
    // Unoccupy any previously blocked path so that max 1 is blocked at a time
    if (this.blockedPath !== null) {
      console.log("UNBLOCKING",this.blockedPath)
      for (const c of this.blockedPath) {
        this.scene.unoccupyTile(cellToPos(c, this.scene.tileSize));
      }
    }

    const blockablePath = this.getMiddlePathCells(path);
    const reservedPath: Cell[] = [];
  console.log("BLOCKING", blockablePath)
    for (const c of blockablePath) {
    
      if (this.scene.occupyTile(cellToPos(c, this.scene.tileSize))) {
        reservedPath.push(c);
      }
    }

    this.blockedPath = reservedPath;
  }

  startWalk(leader: number): void {
    this.walk = {
      isWalking: true,
      leader,
    };
  }

  stopWalk(): void {
    // Unoccupy any previously blocked path so that max 1 is blocked at a time
    if (this.blockedPath !== null) {
      for (const c of this.blockedPath) {
        this.scene.unoccupyTile(cellToPos(c, this.scene.tileSize));
      }
    }

    this.blockedPath = null;

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
