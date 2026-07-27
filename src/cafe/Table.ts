import { StaticImage, type Direction, type Vec2 } from "../lib";
import type Play from "../Play";

export default class Table extends StaticImage {
  seats: { pos: Vec2; direction: Direction }[];
  restaurants: string[];

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    seats: { pos: Vec2; direction: Direction }[],
    restaurants: string[],
  ) {
    super(scene, pos, width, height, image);
    this.seats = seats;
    this.restaurants = restaurants;
  }

  getSeat(): { pos: Vec2; direction: Direction } {
    return this.seats[0]; // randomEl(this.seats)!;
  }

  getArrivePos(
    currentPos: Vec2,
    seat: { pos: Vec2; direction: Direction },
    tileSize: number,
  ): Vec2 {
    switch (seat.direction) {
      case "n":
      case "s": {
        const useWestSide = currentPos.x < seat.pos.x;
        return {
          x: useWestSide
            ? seat.pos.x - tileSize * 2
            : seat.pos.x + tileSize * 2,
          y: seat.pos.y,
        };
      }
      case "w":
      case "e": {
        const useNorthSide = currentPos.y < seat.pos.y;
        return {
          x: seat.pos.x,
          y: useNorthSide
            ? seat.pos.y - tileSize * 2
            : seat.pos.y + tileSize * 2,
        };
      }
      default:
        throw new Error(`Unsupported seat direction: ${seat.direction}`);
    }
  }

  getClosestCornerPos(currentPos: Vec2, tileSize: number): Vec2 {
    // if (this.image !== "round-table") {
    //   throw new Error(
    //     "Table.getClosestCornerPos is currently only implemented for round-table",
    //   );
    // }

    const corners = [
      { x: this.pos.x - tileSize, y: this.pos.y - tileSize },
      { x: this.pos.x + tileSize * 2, y: this.pos.y - tileSize },
      { x: this.pos.x + tileSize * 2, y: this.pos.y + tileSize },
      { x: this.pos.x - tileSize, y: this.pos.y + tileSize },
    ];

    let closest = corners[0];
    let minDistSq = Number.POSITIVE_INFINITY;

    for (const corner of corners) {
      const dx = corner.x - currentPos.x;
      const dy = corner.y - currentPos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = corner;
      }
    }

    return closest;
  }
}
