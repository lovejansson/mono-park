import AnimationManager from "../animations/AnimationManager.js";
import ArtObject from "./ArtObject.ts";
import type Scene from "../Scene.js";
import type { Vec2, Direction } from "../types.ts";
import { posToCell } from "../utils.ts";

type PathState = {
  isOnPath: boolean;
  hasReachedGoal: boolean;
};

export default abstract class Sprite extends ArtObject {
  vel: Vec2;
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
  direction: Direction;
  animations: AnimationManager;
  drawOffset: Vec2;

  path: PathState;

  constructor(
    scene: Scene,
    pos: Vec2,
    width: number,
    height: number,
    direction: Direction,
  ) {
    super(scene, pos);
    this.vel = { x: 0, y: 0 };
    this.width = width;
    this.height = height;
    this.direction = direction;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
    this.animations = new AnimationManager(this);
    this.drawOffset = { x: 0, y: 0 };
    this.path = {
      isOnPath: false,
      hasReachedGoal: false,
    };
  }

  abstract update(dt: number): void;

  updateMovement(): void {}

  getGridCell() {
    return posToCell(this.pos, this.scene.art!.tileSize);
  }

  isFacingEast(): boolean {
    return this.direction === "e";
  }

  isFacingWest(): boolean {
    return this.direction === "w";
  }
  isFacingNorth(): boolean {
    return this.direction === "n";
  }

  isFacingSouth(): boolean {
    return this.direction === "s";
  }
}
