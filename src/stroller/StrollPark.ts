import { posToCell, type Direction, type Vec2 } from "../lib";
import type Play from "../Play";

export enum StrollSpot {
  POND_BENCH,
  CACTUSES,
  SKATE_GROUND,
  GRASS_BY_THE_POND,
  BRIDGE,
}

export type StrollSpotData = {
  spot: StrollSpot;
  positions: { pos: Vec2; direction: Direction }[];
};

export default class StrollPark {
  private play: Play;
  private spots: StrollSpotData[];
  private occupiedStrollSpotState: Map<StrollSpot, string>; // One group at a time can be at a stroll spot!

  private blockingParkGroup: string | null;

  constructor(play: Play, spots: StrollSpotData[]) {
    this.play = play;
    this.spots = spots;
    this.occupiedStrollSpotState = new Map();
    this.blockingParkGroup = null;
  }

  isOccupyingStrollSpot(strollSpot: StrollSpot, group: string): boolean {
    return this.occupiedStrollSpotState.get(strollSpot) === group;
  }

  getSpotPositions(spot: StrollSpot): Vec2[] {
    const spotState = this.getStrollSpot(spot);

    return spotState.positions.map((p) => p.pos);
  }

  isStrollSpotOccupied(strollSpot: StrollSpot): boolean {
    return this.occupiedStrollSpotState.has(strollSpot);
  }

  occupyStrollSpot(strollSpot: StrollSpot, group: string): void {
    const occupiedBy = this.occupiedStrollSpotState.get(strollSpot);
    if (occupiedBy !== undefined)
      throw new Error(`Stroll spot is already occupied by ${occupiedBy}`);

    this.occupiedStrollSpotState.set(strollSpot, group);
  }

  unoccupyStrollSpot(strollSpot: StrollSpot, group: string): void {
    const occupiedBy = this.occupiedStrollSpotState.get(strollSpot);
    if (occupiedBy !== group)
      throw new Error(
        `Stroll spot is not occupied by ${group}, state is: ${occupiedBy}`,
      );
    this.occupiedStrollSpotState.delete(strollSpot);
  }

  private getStrollSpot(strollSpot: StrollSpot): StrollSpotData {
    const spot = this.spots.find((s) => s.spot === strollSpot);

    if (spot === undefined) throw new Error("Stroll spot not found!");

    return spot;
  }

  getStrollPos(strollSpot: StrollSpot): { pos: Vec2; direction: Direction } {
    const spot = this.getStrollSpot(strollSpot);

    const spotPos = spot.positions.find(
      (p) =>
        !this.play.grid.isTileOccupied(posToCell(p.pos, this.play.tileSize)),
    );

    console.log(spotPos);

    if (spotPos === undefined)
      throw new Error("No free position found for stroll spot!");

    return { pos: spotPos.pos, direction: spotPos.direction };
  }

  getBlockingPark(): string | null {
    return this.blockingParkGroup;
  }

  isParkBlocked(): boolean {
    return this.blockingParkGroup !== null;
  }

  isBlockingPark(group: string): boolean {
    return this.blockingParkGroup === group;
  }

  blockPark(group: string): void {
    if (this.blockingParkGroup !== null)
      throw new Error(
        `Park is already blocked by group ${this.blockingParkGroup}`,
      );
    this.blockingParkGroup = group;
  }

  unblockPark(group: string): void {
    if (this.blockingParkGroup !== group)
      throw new Error(
        `Park is not blocked by group ${group}, state: ${this.blockingParkGroup}`,
      );
    this.blockingParkGroup = null;
  }
}
