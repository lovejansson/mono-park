import { type ActionTag } from "../actions";
import Fika from "../cafe/Fika";
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
  static WALK_SPEED = 1;

  private initAction: ActionTag;


  constructor(scene: Play, pos: Vec2, name: string, initAction: ActionTag, group: Group) {
    super(scene, pos, name, group);
    this.initAction = initAction;
  
  }

  init(): void {
    super.init();
    switch (this.initAction) {
      case Fika.TAG:
        // this.transitionToAction(Stroll.TAG, this);
        break;
      case Stroll.TAG:
        this.transitionToAction(Stroll.TAG, this);
        break;
      default:
        throw new Error("Invalid state for stroller");
    }
  }

  update(dt: number): void {
    if (this.currentAction.isComplete()) {
      switch (this.initAction) {
        case Fika.TAG:
          // this.transitionToAction(Stroll.TAG, this);
          break;
        case Stroll.TAG:
          this.transitionToAction(Stroll.TAG, this);
          break;
        default:
          throw new Error("Invalid state for stroller");
      }
    }

    this.currentAction.update(dt);
  }
}
