import type Scene from "../Scene.ts";
import type { Vec2 } from "../types.ts";

export default abstract class ArtObject {
  id: number;
  scene: Scene;
  pos: Vec2;

  constructor(scene: Scene, pos: Vec2) {
    this.scene = scene;
    this.pos = pos;

    if (scene.art === null)
      throw new Error("art instance is not set on scene object");

    this.id = scene.art.getId();
  }

  update(_dt: number): void {}
}
