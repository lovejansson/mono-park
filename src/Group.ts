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
  private scene: Play;
  private walk: WalkState;
  private strollSpots: StrollSpot[];
  private currStrollSpotIdx: number;
  private isOccupyingStrollSpot: boolean;

  constructor(scene: Play, strollSpots: StrollSpot[]) {
    this.scene = scene;
    this.walk = { isWalking: false };
    this.strollSpots = strollSpots;
    this.currStrollSpotIdx = 0;
    this.isOccupyingStrollSpot = false;
  }

  getStrollSpot(): StrollSpot {
    return this.strollSpots[this.currStrollSpotIdx];
  }

  selectNextAvailableStrollSpot(): boolean {
    for (let offset = 1; offset < this.strollSpots.length; offset++) {
      const nextSpotIdx =
        (this.currStrollSpotIdx + offset) % this.strollSpots.length;
      const nextSpot = this.strollSpots[nextSpotIdx];

      if (!this.scene.isStrollSpotOccupied(nextSpot)) {
        this.unoccupyCurrentStrollSpot();
        this.currStrollSpotIdx = nextSpotIdx;
        this.occupyCurrentStrollSpot();
        return true;
      }
    }

    return false;
  }

  startWalk(leader: number): boolean {
    if (
      !this.occupyCurrentStrollSpot() &&
      !this.selectNextAvailableStrollSpot()
    ) {
      return false;
    }

    this.scene.groupIsStrolling = true;
    this.walk = {
      isWalking: true,
      leader,
    };
    return true;
  }

  stopWalk(): void {
    this.scene.groupIsStrolling = false;
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

  private occupyCurrentStrollSpot(): boolean {
    if (this.isOccupyingStrollSpot) return true;

    this.isOccupyingStrollSpot = this.scene.occupyStrollSpot(
      this.getStrollSpot(),
    );

    return this.isOccupyingStrollSpot;
  }

  private unoccupyCurrentStrollSpot(): void {
    if (!this.isOccupyingStrollSpot) return;

    this.scene.unoccupyStrollSpot(this.getStrollSpot());
    this.isOccupyingStrollSpot = false;
  }
}
