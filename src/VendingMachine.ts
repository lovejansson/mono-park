import { StaticImage, type Vec2 } from "./lib";
import type Play from "./Play";

export default class VendingMachine extends StaticImage {
  isFree: boolean;
  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
  ) {
    super(scene, pos, width, height, "vending-machine");
    this.isFree = true;
  }
}

