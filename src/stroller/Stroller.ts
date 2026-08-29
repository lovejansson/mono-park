import type Group from "../Group";
import Human from "../Human";
import type { Vec2 } from "../lib/types";
import Play from "../Play";
import Stroll from "./Stroll";

export default class Stroller extends Human {
  constructor(scene: Play, pos: Vec2, name: string, group: Group) {
    super(scene, pos, name, group);
  }

  init(): void {
    super.init();
    this.transitionToAction(Stroll.TAG, this);
  }

  update(dt: number): void {
    this.currentAction.update(dt);

    // Put the stroller a little bit above the pond shore line. 
    if (
      this.pos.x > 2 * this.scene.art.tileSize &&
      this.pos.x < 8 * this.scene.art.tileSize &&
      this.pos.y === 5 * this.scene.art.tileSize
    ) {
      this.drawOffset.y = -this.tileSize * 1.5;
    } else {
      this.drawOffset.y = -this.tileSize;
    }
  }
}
