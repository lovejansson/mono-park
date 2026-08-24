import AnimationManager from "../animations/AnimationManager.js";
import ArtObject from "./ArtObject.ts";
import type Scene from "../Scene.js";
import type Path from "../Path.ts";
import type { Vec2, Direction } from "../types.ts";
import { posToCell } from "../utils.ts";
import type AnimationSequence from "../animations/AnimationSequence.ts";

export default abstract class Sprite extends ArtObject {
  vel: Vec2;
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
  direction: Direction;
  animations: AnimationManager;
  drawOffset: Vec2;

  currentPath: Path | null;
  currentAnimationSequence: AnimationSequence | null;

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

    this.currentPath = null;
    this.currentAnimationSequence = null;
  }

  abstract update(dt: number): void;

  isOnActivePath(): boolean {
    return (
      this.currentPath !== null &&
      !this.currentPath.isWaiting &&
      !this.currentPath.hasReachedGoal
    );
  }

  isOnActiveAnimationSequence(): boolean {
    return (
      this.currentAnimationSequence !== null &&
      !this.currentAnimationSequence.isFinished
    );
  }

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
