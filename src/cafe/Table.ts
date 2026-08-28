import { ArtObject, StaticImage, type Direction, type Vec2 } from "../lib";
import type Play from "../Play";

export default class Table extends StaticImage {
  private seats: Seat[];
  private guestSeats: Map<number, number | null>;
  private play: Play;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    seats: Seat[],
  ) {
    super(scene, pos, width, height, image);
    this.play = scene;
    this.seats = seats;
    this.guestSeats = new Map();
  }

  init(): void {
    for (const s of this.seats) {
      this.guestSeats.set(s.id, null);
    }
  }

  getSeat(guest: number, wish: Direction): Seat {
    const freeSeat = this.seats.find(
      (s) => s.direction === wish && this.guestSeats.get(s.id) === null,
    );

    if (freeSeat === undefined) throw new Error("No seat available for guest.");

    this.guestSeats.set(freeSeat.id, guest);

    return freeSeat;
  }

  leaveSeat(guest: number, seat: number): void {
    const isValidSeat = this.seats.find((s) => s.id === seat) !== undefined;

    if (!isValidSeat) throw new Error("Seat is not at this table.");

    const guestAtSeat = this.guestSeats.get(seat);

    if (guestAtSeat !== guest)
      throw new Error(`Guest is not seated here, state: ${guestAtSeat}`);

    this.guestSeats.set(seat, null);
  }

  getArrivePos(currentPos: Vec2, seat: Seat): Vec2 {
    switch (seat.direction) {
      case "n":
      case "s": {
        const useWestSide = currentPos.x < seat.pos.x;
        return {
          x: useWestSide
            ? seat.pos.x - this.play.tileSize * 2
            : seat.pos.x + this.play.tileSize * 2,
          y: seat.pos.y,
        };
      }
      case "w":
      case "e": {
        const useNorthSide = currentPos.y < seat.pos.y;
        return {
          x: seat.pos.x,
          y: useNorthSide
            ? seat.pos.y - this.play.tileSize * 2
            : seat.pos.y + this.play.tileSize * 2,
        };
      }
      default:
        throw new Error(`Unsupported seat direction: ${seat.direction}`);
    }
  }

  getClosestCornerPos(currentPos: Vec2): Vec2 {
    const corners = [
      {
        x: this.pos.x - this.play.tileSize,
        y: this.pos.y,
      },
      {
        x: this.pos.x + this.play.tileSize * 3,
        y: this.pos.y,
      },
      {
        x: this.pos.x + this.play.tileSize * 3,
        y: this.pos.y + this.play.tileSize,
      },
      {
        x: this.pos.x - this.play.tileSize,
        y: this.pos.y + this.play.tileSize,
      },
    ];

    let closest = corners[0];
    let minDist = Number.POSITIVE_INFINITY;

    for (const corner of corners) {
      const dx = corner.x - currentPos.x;
      const dy = corner.y - currentPos.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = corner;
      }
    }

    return closest;
  }
}

export class Seat extends ArtObject {
  direction: Direction;
  constructor(scene: Play, pos: Vec2, direction: Direction) {
    super(scene, pos);
    this.direction = direction;
  }

  getSeatedDirection(): Direction {
    switch (this.direction) {
      case "n":
        return "s";
      case "e":
        return "w";
      case "s":
        return "n";
      case "w":
        return "e";
    }

    throw new Error("Invalid direction!");
  }
}
