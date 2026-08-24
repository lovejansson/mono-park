import { StaticImage, type Vec2 } from "./lib";
import type Play from "./Play";

export default class Bench extends StaticImage {
  isFree: boolean;
  isAtSkateGround: boolean;
  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    isAtSkateGround: boolean,
  ) {
    super(scene, pos, width, height, "bench");
    this.isFree = true;
    this.isAtSkateGround = isAtSkateGround;
  }
}
