import { Sprite, StaticImage, type Vec2 } from "../lib";
import type Play from "../Play";

enum DoorState {
  OPENING,
  CLOSING,
  OPEN,
  CLOSED,
}

const ANIM_OPENING = "opening";
const ANIM_CLOSING = "closing";
const ANIM_OPEN = "open";
const ANIM_CLOSED = "closed";

export class Door extends Sprite {
  private state: DoorState;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    spritesheet: string,
  ) {
    super(scene, pos, width, height, "s");
    this.state = DoorState.CLOSED;
    this.animations.registerSpritesheet(spritesheet);
  }

  isOpen() {
    return this.state === DoorState.OPEN;
  }

  isClosed() {
    return this.state === DoorState.CLOSED;
  }

  close() {
    this.state = DoorState.CLOSING;
    this.animations.play(ANIM_CLOSING);
  }

  open() {
    this.state = DoorState.OPENING;
    this.animations.play(ANIM_OPENING);
  }

  update(_: number): void {
    switch (this.state) {
      case DoorState.OPENING:
        if (!this.animations.isPlaying(ANIM_OPENING)) {
          this.state = DoorState.OPEN;
          this.animations.play(ANIM_OPEN);
        }
        break;
      case DoorState.CLOSING:
        if (!this.animations.isPlaying(ANIM_CLOSING)) {
          this.animations.play(ANIM_CLOSED);
          this.state = DoorState.CLOSED;
        }
        break;
      case DoorState.OPEN:
        if (
          !this.animations.isPlaying(ANIM_OPEN)
        ) {
          this.animations.play(ANIM_OPEN);
        }
        break;
      case DoorState.CLOSED:
        if (
          !this.animations.isPlaying(ANIM_CLOSED)
        ) {
          this.animations.play(ANIM_CLOSED);
        }
        break;
    }
  }
}

export default class House extends StaticImage {
  private door: Door;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    door: Door,
  ) {
    super(scene, pos, width, height, image);
    this.door = door;
  }

  getArrivePos(): Vec2 {
    return {
      x: this.door.pos.x + this.door.halfWidth / 2,
      y: this.pos.y + this.height,
    };
  }

  closeDoor() {
    this.door.close();
  }

  openDoor() {
    this.door.open();
  }

  isDoorClosed() {
    return this.door.isClosed();
  }

  isDoorOpen() {
    return this.door.isOpen();
  }
}
