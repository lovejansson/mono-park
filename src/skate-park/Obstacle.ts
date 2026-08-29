import { Scene, StaticImage } from "../lib";
import type { Tile, Direction, Vec2 } from "../lib/types";
import { tileToPos, manhattan, posToTile } from "../lib";
import type Grid from "../lib/Grid";

export const obstacles = ["rail", "bowl", "flat"] as const;

export type ObstacleType = (typeof obstacles)[number];

export const tricks = [
  "ollie",
  "pop-shove-it",
  "360-shove-it",
  "kickflip",
  "50-50-grind",
  "5-0-grind",
  "nose-grind",
  "grab",
  "180",
  "360",
] as const;

export type Trick = (typeof tricks)[number];

export const obstacleTricks: { [k in ObstacleType]: Trick[] } = {
  rail: ["50-50-grind", "5-0-grind", "nose-grind"],
  bowl: ["180", "360", "grab"],
  flat: ["ollie", "pop-shove-it", "kickflip", "360-shove-it"],
};

export default class Obstacle extends StaticImage {
  readonly type: ObstacleType;

  private queue: number[];

  private isFree: boolean;

  private numSkatersLimit: number;

  protected skaters: number[];

  private currSkater: number | null;

  protected tileSize: number;

  constructor(
    scene: Scene,
    type: ObstacleType,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    numSkatersLimit: number,
  ) {
    super(scene, pos, width, height, image);
    this.type = type;
    this.queue = [];
    this.isFree = true;
    this.currSkater = null;
    this.skaters = [];
    this.numSkatersLimit = numSkatersLimit;
    this.tileSize = this.scene.art!.tileSize;
  }

  getNumSkaters(): number {
    return this.skaters.length;
  }

  getArrivePos(_: Vec2, __: Grid): Vec2 {
    return { x: this.pos.x - this.tileSize, y: this.pos.y - this.tileSize };
  }

  isOccupiedByMe(id: number): boolean {
    return this.currSkater === id;
  }

  isMyTurn(id: number): boolean {
    return this.isFree && this.queue[0] === id;
  }

  isStandingInLine(id: number) {
    return this.queue.includes(id);
  }

  /**
   * Call this when skater should occupy the obsticle, it will remove the skater from the queue and set the obsticle to not free.
   */
  skate(id: number) {
    if (this.queue[0] !== id) throw new Error("Wait for your turn mr");

    this.currSkater = this.queue.shift()!;

    if (id !== this.currSkater) throw new Error("WHY????");

    this.isFree = false;
  }

  /**
   * When skater is done with their round of tricks they end the skate.
   * If they want to reenter the queue they have to do so manually.
   */
  endSkate(id: number) {
    if (this.currSkater !== id)
      throw new Error("Skater is not skating the obstacle: " + id);

    this.currSkater = null;

    this.isFree = true;
  }

  leave(id: number) {
    const skaterIdx = this.skaters.findIndex((s) => s === id);

    if (skaterIdx === -1) throw new Error("Skater is not at obstacle: " + id);

    if (this.isStandingInLine(id)) {
      const qi = this.queue.findIndex((i) => i === id);

      if (qi !== -1) this.queue.splice(qi, 1);
      else throw new Error("Skater was in line but couldn't find index");
    }

    this.skaters.splice(skaterIdx, 1);
  }

  /**
   * When skater has arrived they can stand in line to go skate the obsticle.
   */
  standInLine(id: number): void {
    if (this.currSkater === id)
      throw new Error("End skate before standing in line again: " + id);
    this.assertSkaterIsAtObstacle(id);

    if (this.isStandingInLine(id)) {
      throw new Error("Skater is already in line: " + id);
    }

    this.queue.push(id);
  }

  /**
   * Skater needs to arrive to get an idle position at the obsticle.
   */
  arrive(id: number): void {
    if (this.isTooCrowded()) throw new Error("Obstacle is too crowded");
    this.skaters.push(id);
  }

  isTooCrowded(): boolean {
    return this.skaters.length === this.numSkatersLimit;
  }

  protected assertSkaterIsAtObstacle(id: number): number {
    const skater = this.skaters.find((s) => s === id);

    if (skater === undefined) throw new Error("Skater is not at obstacle.");

    return skater;
  }
}

export class Rail extends Obstacle {
  private startPositions: { pos: Vec2; railSide: RailSide }[];
  private idlePositions: Vec2[];

  constructor(scene: Scene, pos: Vec2, width: number, height: number) {
    super(scene, "rail", pos, width, height, "rail", 4);
    this.startPositions = [
      {
        pos: { x: this.pos.x - 3 * scene.art!.tileSize, y: this.pos.y },
        railSide: RailSide.LEFT,
      },
      {
        pos: {
          x: this.pos.x + this.width + 2 * scene.art!.tileSize,
          y: this.pos.y,
        },
        railSide: RailSide.RIGHT,
      },
    ];

    this.idlePositions = [
      {
        x: this.pos.x - 3 * scene.art.tileSize,
        y: this.pos.y - scene.art.tileSize,
      },
      {
        x: this.pos.x - 2 * scene.art.tileSize,
        y: this.pos.y - scene.art.tileSize,
      },

      {
        x: this.pos.x - scene.art.tileSize,
        y: this.pos.y - scene.art.tileSize,
      },
      {
        x: this.pos.x + this.width + scene.art.tileSize,
        y: this.pos.y - scene.art.tileSize,
      },

      {
        x: this.pos.x + this.width + 2 * scene.art.tileSize,
        y: this.pos.y - scene.art.tileSize,
      },

      {
        x: this.pos.x + this.width + 3 * scene.art.tileSize,
        y: this.pos.y - scene.art.tileSize,
      },
      {
        x: this.pos.x + this.width + 2 * scene.art.tileSize,
        y: this.pos.y + scene.art.tileSize,
      },
    ];
  }

  getArrivePos(from: Vec2, grid: Grid): Vec2 {
    const fromTile = posToTile(from, this.tileSize);

    let min = Infinity;

    let arrivePos: Vec2 | null = null;
    let dist = 0;

    let tile: Tile = { row: 0, col: 0 };

    for (const p of this.idlePositions) {
      tile = posToTile(p, this.tileSize);
      dist = manhattan(fromTile, tile);

      if (dist < min && !grid.isTileOccupied(tile)) {
        min = dist;
        arrivePos = tileToPos(tile, this.tileSize);
      }
    }

    if (arrivePos === null) {
      // Can technically happen but shouldn't happen since grid is not that full
      throw new Error("No arrive position is free for the rail!");
    }

    return arrivePos;
  }

  getClosestTrickStartPos(from: Vec2): { pos: Vec2; railSide: RailSide } {
    // Returns either the right or left side of the rail

    const fromTile = posToTile(from, this.tileSize);

    const distLeft = manhattan(
      fromTile,
      posToTile(this.startPositions[0].pos, this.tileSize),
    );

    const distRight = manhattan(
      fromTile,
      posToTile(this.startPositions[1].pos, this.tileSize),
    );

    return distLeft < distRight
      ? this.startPositions[0]
      : this.startPositions[1];
  }
}

export enum RailSide {
  LEFT = "left",
  RIGHT = "right",
}

export class Bowl extends Obstacle {
  private startPositions: { pos: Vec2; bowlSide: BowlSide }[];
  private idlePositions: Vec2[];

  constructor(scene: Scene, pos: Vec2, width: number, height: number) {
    super(scene, "bowl", pos, width, height, "bowl", 4);

    this.startPositions = [
      {
        pos: {
          x: this.pos.x + this.halfWidth - this.tileSize,
          y: this.pos.y - this.tileSize,
        },
        bowlSide: BowlSide.TOP,
      },
      {
        pos: {
          x: this.pos.x + this.halfWidth,
          y: this.pos.y + this.height,
        },
        bowlSide: BowlSide.BOTTOM,
      },
      {
        pos: {
          x: this.pos.x - this.tileSize,
          y: this.pos.y + this.halfHeight - this.tileSize,
        },
        bowlSide: BowlSide.LEFT,
      },
      {
        pos: {
          x: this.pos.x + this.width,
          y: this.pos.y + this.halfHeight - this.tileSize,
        },
        bowlSide: BowlSide.RIGHT,
      },
    ];
    this.idlePositions = [
      {
        x: this.pos.x,
        y: this.pos.y - this.tileSize,
      },

      {
        x: this.pos.x + this.tileSize * 5,
        y: this.pos.y - this.tileSize,
      },
      // RIGHT
      {
        x: this.pos.x + this.width,
        y: this.pos.y + this.tileSize,
      },
      {
        x: this.pos.x + this.width,
        y: this.pos.y + this.height - this.tileSize,
      },
      // BOTTOM
      {
        x: this.pos.x,
        y: this.pos.y + this.height,
      },
      {
        x: this.pos.x + this.tileSize * 5,
        y: this.pos.y + this.height,
      },

      // LEFT SIDE
      {
        x: this.pos.x - this.tileSize,
        y: this.pos.y + this.tileSize,
      },
      {
        x: this.pos.x - this.tileSize,
        y: this.pos.y + this.height - this.tileSize,
      },
    ];
  }

  getArrivePos(from: Vec2, grid: Grid): Vec2 {
    
    // Search around the bowl for a position that has the min distance to 'from'

    const fromTile = posToTile(from, this.tileSize);

    let min = Infinity;

    let arrivePos: Vec2 | null = null;
    let dist = 0;

    let tile: Tile = { row: 0, col: 0 };

    for (const p of this.idlePositions) {
      tile = posToTile(p, this.tileSize);
      dist = manhattan(fromTile, tile);

      if (dist < min && !grid.isTileOccupied(tile)) {
        min = dist;
        arrivePos = tileToPos(tile, this.tileSize);
      }
    }

    if (arrivePos === null) {
      // Can technically happen but shouldn't happen since grid is not that full
      throw new Error("No arrive position is free for the bowl!");
    }

    return arrivePos;
  }

  getClosestTrickStartPos(from: Vec2): { pos: Vec2; bowlSide: BowlSide } {
    let min = Infinity;
    let pos: { pos: Vec2; bowlSide: BowlSide } = this.startPositions[0];

    for (const p of this.startPositions) {
      const dist = manhattan(
        posToTile(from, this.tileSize),
        posToTile(p.pos, this.tileSize),
      );

      if (dist < min) {
        min = dist;
        pos = p;
      }
    }

    return pos;
  }
}

export enum BowlSide {
  TOP = "top",
  RIGHT = "right",
  BOTTOM = "bottom",
  LEFT = "left",
}

export const bowlSideToStartDir: Map<BowlSide, Direction> = new Map([
  [BowlSide.TOP, "s"],
  [BowlSide.RIGHT, "w"],
  [BowlSide.BOTTOM, "n"],
  [BowlSide.LEFT, "e"],
]);

export const bowlSideToEndDir: Map<BowlSide, Direction> = new Map([
  [BowlSide.TOP, "n"],
  [BowlSide.RIGHT, "e"],
  [BowlSide.BOTTOM, "s"],
  [BowlSide.LEFT, "w"],
]);

export class Flat extends Obstacle {
  private positions: Vec2[];
  constructor(scene: Scene, pos: Vec2, width: number, height: number) {
    super(scene, "flat", pos, width, height, "flat", 2);
    this.positions = [
      { x: 26 * this.scene.art.tileSize, y: 5 * this.scene.art.tileSize },
      { x: 36 * this.scene.art.tileSize, y: 8 * this.scene.art.tileSize },
      { x: 26 * this.scene.art.tileSize, y: 11 * this.scene.art.tileSize },
    ];
  }

  getArrivePos(_: Vec2, grid: Grid): Vec2 {
    const arrivePos =
      this.positions.find(
        (p) => !grid.isTileOccupied(posToTile(p, this.scene.art.tileSize)),
      ) ?? null;

    if (arrivePos === null) {
      // Can technically happen but shouldn't happen since grid is not that full
      throw new Error("No arrive position is free for the flat obstacle!");
    }

    return arrivePos;
  }
}
