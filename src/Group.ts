import { posToCell } from "./lib";
import type { Direction, Vec2 } from "./lib/types";
import type { StrollSpot } from "./Play";
import type Play from "./Play";

type WalkStateInactive = {
  isWalking: false;
};

type WalkStateActive = {
  isWalking: true;
  leader: number;
  slots: Map<Direction, number>;
};


type WalkState = WalkStateActive | WalkStateInactive;

export default class Group {
  private scene: Play;
  private walk: WalkState;
  private walkSlots: { direction: Direction; follower: number | null }[];
  private strollSpots: StrollSpot[];
  private currStrollSpotIdx: number;

  constructor(scene: Play, strollSpots: StrollSpot[]) {
    this.scene = scene;
    this.walk = { isWalking: false };
    this.walkSlots = [
      { direction: "n", follower: null },
      { direction: "ne", follower: null },
      { direction: "e", follower: null },
      { direction: "se", follower: null },
      { direction: "s", follower: null },
      { direction: "sw", follower: null },
      { direction: "w", follower: null },
      { direction: "nw", follower: null },
    ];

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

  private clearWalkSlots(): void {
    for (const slot of this.walkSlots) {
      slot.follower = null;
    }
  }

  startWalk(leader: number): void {
    this.clearWalkSlots();
    this.walk = {
      isWalking: true,
      leader,
      slots: new Map(),
    };
  }

  stopWalk(): void {
    this.clearWalkSlots();
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

  private getWorldDirectionForSlot(slot: Direction): Direction {
    if (!this.walk.isWalking) throw Error("No walk is active");

    const leader = this.scene.getHuman(this.walk.leader);
    const directionOrder: Direction[] = [
      "n",
      "ne",
      "e",
      "se",
      "s",
      "sw",
      "w",
      "nw",
    ];
    const slotIdx = directionOrder.indexOf(slot);
    const leaderIdx = directionOrder.indexOf(leader.direction);

    if (slotIdx === -1 || leaderIdx === -1)
      throw new Error("Unsupported direction for slot positioning");

    return directionOrder[(slotIdx + leaderIdx) % directionOrder.length];
  }

  private isSlotInFrontOfLeader(slot: Direction): boolean {
    if (!this.walk.isWalking) throw Error("No walk is active");

    const leader = this.scene.getHuman(this.walk.leader);
    const worldDirection = this.getWorldDirectionForSlot(slot);

    const directionToVec: Record<Direction, Vec2> = {
      n: { x: 0, y: -1 },
      ne: { x: 1, y: -1 },
      e: { x: 1, y: 0 },
      se: { x: 1, y: 1 },
      s: { x: 0, y: 1 },
      sw: { x: -1, y: 1 },
      w: { x: -1, y: 0 },
      nw: { x: -1, y: -1 },
    };

    const facing = directionToVec[leader.direction];
    const slotVec = directionToVec[worldDirection];
    const dot = facing.x * slotVec.x + facing.y * slotVec.y;

    return dot > 0;
  }

  isSlotValid(slot: Direction): boolean {
    try {
      if (this.isSlotInFrontOfLeader(slot)) return false;
    } catch {
      return false;
    }

    let tile: Vec2;

    try {
      tile = this.getSlotPos(slot);
    } catch {
      return false;
    }

    return this.scene.isTileWalkable(posToCell(tile, this.scene.tileSize));
  }

  getNewSlot(id: number): Direction {
    const slot = this.walkSlots.find((s) => s.follower === id);

    if (slot === undefined) throw new Error("Follower has no previous slot!");

    slot.follower = null;

    return this.setFollowerSlot(id);
  }

  setFollowerSlot(id: number): Direction {
    const slot = this.walkSlots.find(
      (s) => s.follower === null && this.isSlotValid(s.direction),
    );

    if (slot === undefined)
      throw new Error("No valid walk slot is available");

    slot.follower = id;

    return slot.direction;
  }

  getFollowerSlot(id: number): Direction {
    const slot = this.walkSlots.find((s) => s.follower === id);

    if (slot === undefined) throw new Error("Follower has no slot!");

    return slot.direction;
  }

  getSlotPos(slot: Direction): Vec2 {
    if (!this.walk.isWalking) throw Error("No walk is active");

    const leader = this.scene.getHuman(this.walk.leader);
    const leaderTilePos = {
      x: Math.floor(leader.pos.x / this.scene.tileSize) * this.scene.tileSize,
      y: Math.floor(leader.pos.y / this.scene.tileSize) * this.scene.tileSize,
    };

    const worldDirection = this.getWorldDirectionForSlot(slot);

    let slotPos: Vec2;

    switch (worldDirection) {
      case "n":
        slotPos = {
          x: leaderTilePos.x,
          y: leaderTilePos.y - this.scene.tileSize,
        };
        break;
      case "ne":
        slotPos = {
          x: leaderTilePos.x + this.scene.tileSize,
          y: leaderTilePos.y - this.scene.tileSize,
        };
        break;
      case "e":
        slotPos = {
          x: leaderTilePos.x + this.scene.tileSize,
          y: leaderTilePos.y,
        };
        break;
      case "se":
        slotPos = {
          x: leaderTilePos.x + this.scene.tileSize,
          y: leaderTilePos.y + this.scene.tileSize,
        };
        break;
      case "s":
        slotPos = {
          x: leaderTilePos.x,
          y: leaderTilePos.y + this.scene.tileSize,
        };
        break;
      case "sw":
        slotPos = {
          x: leaderTilePos.x - this.scene.tileSize,
          y: leaderTilePos.y + this.scene.tileSize,
        };
        break;
      case "w":
        slotPos = {
          x: leaderTilePos.x - this.scene.tileSize,
          y: leaderTilePos.y,
        };
        break;
      case "nw":
        slotPos = {
          x: leaderTilePos.x - this.scene.tileSize,
          y: leaderTilePos.y - this.scene.tileSize,
        };
        break;
      default:
        throw new Error("Unsupported direction for slot positioning");
    }

    const rows = this.scene.parkGrid.length;
    const cols = this.scene.parkGrid[0]?.length ?? 0;
    const worldWidth = cols * this.scene.tileSize;
    const worldHeight = rows * this.scene.tileSize;

    if (
      slotPos.x < 0 ||
      slotPos.y < 0 ||
      slotPos.x >= worldWidth ||
      slotPos.y >= worldHeight
    ) {
      throw new Error("Slot position is invalid or out of bounds");
    }

    return slotPos;
  }
}
