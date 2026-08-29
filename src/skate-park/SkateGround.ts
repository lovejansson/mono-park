import type Bench from "../Bench";
import { isSamePos, posToTile, type Vec2 } from "../lib";
import type Play from "../Play";
import VendingMachine from "../VendingMachine";
import type { ObstacleType } from "./Obstacle";
import type Obstacle from "./Obstacle";

export default class SkateGround {
  private obstacles: Obstacle[];
  private benches: Bench[];
  private vendingMachines: VendingMachine[];
  private grassIdlePositions: Vec2[];
  private enterPositions: Vec2[];
  private blockingSkateGround: number | null;
  private play: Play;

  constructor(
    play: Play,
    obstacles: Obstacle[],
    benches: Bench[],
    vendingMachines: VendingMachine[],
  ) {
    this.obstacles = obstacles;
    this.play = play;

    if (benches.find((b) => !b.isAtSkateGround))
      throw new Error(
        `Invalid constructor arguments for SkateGround: bench is not at skate ground`,
      );
    this.benches = benches;
    this.grassIdlePositions = [
      { x: 37 * this.play.tileSize, y: 6 * this.play.tileSize },
      { x: 37 * this.play.tileSize, y: 7 * this.play.tileSize },
      { x: 37 * this.play.tileSize, y: 8 * this.play.tileSize },
      { x: 37 * this.play.tileSize, y: 9 * this.play.tileSize },
      { x: 37 * this.play.tileSize, y: 10 * this.play.tileSize },
    ];

    this.enterPositions = [
      { x: 26 * this.play.tileSize, y: 6 * this.play.tileSize },
      { x: 26 * this.play.tileSize, y: 7 * this.play.tileSize },
      { x: 26 * this.play.tileSize, y: 8 * this.play.tileSize },
      { x: 26 * this.play.tileSize, y: 9 * this.play.tileSize },
      { x: 26 * this.play.tileSize, y: 10 * this.play.tileSize },
    ];

    this.vendingMachines = vendingMachines;

    this.blockingSkateGround = null;
  }

  getEnterPos(): Vec2 {
    const pos = this.enterPositions.find(
      (p) => !this.play.grid.isTileOccupied(posToTile(p, this.play.tileSize)),
    );

    if (pos === undefined) throw new Error("No free enter pos found"); // Should not happen according to design

    return pos;
  }

  isValidGrassIdlePos(pos: Vec2): boolean {
    return this.grassIdlePositions.find((p) => isSamePos(p, pos)) !== undefined;
  }

  getGrassIdlePos(): Vec2 {
    const pos = this.grassIdlePositions.find(
      (p) => !this.play.grid.isTileOccupied(posToTile(p, this.play.tileSize)),
    );

    if (pos === undefined) throw new Error("No free idle pos on grass found"); // Should not happen according to design

    return pos;
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  getFreeObstacle(
    allowedObstacleTypes: ObstacleType[],
    excludeType?: string,
  ): Obstacle | null {
    return this.obstacles.reduce(
      (acc, curr) => {
        if (acc === null) return curr;
        if (
          allowedObstacleTypes.includes(curr.type) &&
          curr.type !== excludeType &&
          !curr.isTooCrowded()
        ) {
          acc = curr;
        }
        return acc;
      },
      null as Obstacle | null,
    );
  }

  getObstacle(type: ObstacleType): Obstacle {
    const obstacle = this.obstacles.find((o) => o.type === type);

    if (obstacle === undefined)
      throw new Error(`Obstacle of type ${type} not found!`);

    return obstacle;
  }

  getBlockingSkateGround(): number | null {
    return this.blockingSkateGround;
  }

  isSkateGroundBlocked(): boolean {
    return this.blockingSkateGround !== null;
  }

  isBlockingSkateGround(id: number): boolean {
    return this.blockingSkateGround === id;
  }

  blockSkateGround(id: number): void {
    if (this.blockingSkateGround !== null)
      throw new Error("Skate ground is already blocked!");
    this.blockingSkateGround = id;
  }

  unblockSkateGround(id: number): void {
    if (this.blockingSkateGround !== id)
      throw new Error("Skate ground is not blocked by skater!");
    this.blockingSkateGround = null;
  }

  hasFreeVendingMachines(): boolean {
    return this.vendingMachines.find((v) => v.isFree) !== undefined;
  }

  getFreeVendingMachine(): VendingMachine {
    const vendingMachine = this.vendingMachines.find((v) => v.isFree);
    if (vendingMachine === undefined)
      throw new Error("No free vending machines");
    vendingMachine.isFree = false;
    return vendingMachine;
  }

  returnVendingMachine(vendingMachine: VendingMachine): void {
    const exists = this.vendingMachines.find((v) => v.id === vendingMachine.id);
    if (exists === undefined)
      throw new Error("Vending machine is not at skate ground");
    if (exists.isFree) throw new Error("Vending machine is already free");
    exists.isFree = true;
  }

  hasFreeBenches(): boolean {
    return this.benches.find((b) => b.isFree) !== undefined;
  }

  getFreeBench(): Bench {
    const bench = this.benches.find((b) => b.isFree);
    if (bench === undefined) throw new Error("No free benches");
    bench.isFree = false;
    return bench;
  }

  returnBench(bench: Bench): void {
    const exists = this.benches.find((b) => b.id === bench.id);
    if (exists === undefined) throw new Error("Bench is not at skate ground");
    if (exists.isFree) throw new Error("Bench is already free");
    bench.isFree = true;
  }
}
