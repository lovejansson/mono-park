import ArtObject from "./ArtObject.js";
import Scene from "../Scene.js";
import type { Vec2 } from "../types.ts";

export default class StaticImage extends ArtObject {
  pos: Vec2;
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
  image: string;

  constructor(
    scene: Scene,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
  ) {
    super(scene);
    this.pos = pos;
    this.width = width;
    this.height = height;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
    this.image = image;
  }
}
