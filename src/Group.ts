import type Play from "./Play";
import type { StrollSpot } from "./stroller/StrollPark";

type WalkStateInactive = {
  isWalking: false;
};

type WalkStateActive = {
  isWalking: true;
  leader: number;
};

type WalkState = WalkStateActive | WalkStateInactive;

export default class Group {
  name: string;
  private play: Play;
  private walk: WalkState;
  private strollSpots: StrollSpot[];
  private currStrollSpotIdx: number;

  constructor(scene: Play, name: string, strollSpots: StrollSpot[]) {
    this.play = scene;
    this.name = name;
    this.walk = { isWalking: false };
    this.strollSpots = strollSpots;
    this.currStrollSpotIdx = 0;
  }

  init() {
    if (this.strollSpots.length === 0) return;
    this.play.strollPark.occupyStrollSpot(this.getStrollSpot(), this.name);
  }

  getStrollSpot(): StrollSpot {
    return this.strollSpots[this.currStrollSpotIdx];
  }

  selectNextAvailableStrollSpot(): boolean {
    for (let offset = 1; offset < this.strollSpots.length; offset++) {
      const nextSpotIdx =
        (this.currStrollSpotIdx + offset) % this.strollSpots.length;
      const nextSpot = this.strollSpots[nextSpotIdx];

      if (!this.play.strollPark.isStrollSpotOccupied(nextSpot)) {
        this.play.strollPark.unoccupyStrollSpot(
          this.getStrollSpot(),
          this.name,
        );
        this.currStrollSpotIdx = nextSpotIdx;
        this.play.strollPark.occupyStrollSpot(this.getStrollSpot(), this.name);
        return true;
      }
    }

    return false;
  }

  startWalk(leader: number): void {
    if (this.play.strollPark.isParkBlocked())
      throw new Error(
        `Park is already blocked by: ${this.play.strollPark.getBlockingPark()}`,
      );

    const hasOccupiedNextStrollSpot = this.selectNextAvailableStrollSpot();

    if (!hasOccupiedNextStrollSpot) throw new Error(`No available strollpot`);

    this.play.strollPark.blockPark(this.name);

    this.walk = {
      isWalking: true,
      leader,
    };
  }

  stopWalk(): void {
    this.play.strollPark.unblockPark(this.name);
    this.walk = { isWalking: false };
  }

  isWalking(): boolean {
    return this.walk.isWalking;
  }

  getLeader(): number {
    if (!this.walk.isWalking) throw new Error("No walk is active");
    return this.walk.leader;
  }
}
