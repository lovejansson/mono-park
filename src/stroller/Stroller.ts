import { type ActionTag } from "../actions";
import type Group from "../Group";
import Human from "../Human";
import type { Vec2 } from "../lib/types";
import Play from "../Play";
import Stroll from "./Stroll";

export enum PositionUpdateType {
  VEL,
  DELTA,
}

export default class Stroller extends Human {

  constructor(
    scene: Play,
    pos: Vec2,
    name: string,
    group: Group,
  ) {
    super(scene, pos, name, group);
  }

  init(): void {
    super.init();
    this.transitionToAction(Stroll.TAG, this);
  }

  update(dt: number): void {
    this.currentAction.update(dt);
  }
}
