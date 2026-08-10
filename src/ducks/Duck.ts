import { createAction } from "../actions";
import { Sprite } from "../lib";
import type { Vec2 } from "../lib/types";
import Play from "../Play";
import {
  DuckWalk,
  type DuckWalkActionSpec,
  type DuckWalkActionTag,
  type DuckWalkUpdatable,
} from "./DuckWalk";

export enum PositionUpdateType {
  VEL,
  DELTA,
}

export default class Duck extends Sprite {
  static SPEED = 1;

  action: DuckWalkActionTag | null;
  currentAction!: DuckWalkUpdatable;

  constructor(scene: Play, pos: Vec2) {
    super(scene, pos, scene.art.tileSize, scene.art.tileSize, "s");
    this.action = DuckWalk.TAG;
  }

  init(): void {
 
    this.animations.registerSpritesheet("duck");
    this.transitionToAction(DuckWalk.TAG, this);


    this.animations.onFrameChange = (anim: string) => {
      if (anim.includes("idle")) {
        this.vel.y = 0;
        this.vel.x = 0;
      } else if (anim.includes("walk") || anim.includes("swim")) {
        switch (this.direction) {
          case "n":
            this.vel.y = -Duck.SPEED;
            this.vel.x = 0;
            break;
          case "e":
            this.vel.x = Duck.SPEED;
            this.vel.y = 0;
            break;
          case "s":
            this.vel.y = Duck.SPEED;
            this.vel.x = 0;
            break;
          case "w":
            this.vel.x = -Duck.SPEED;
            this.vel.y = 0;
            break;
        }
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
      } else {
        throw new Error("Animation " + anim + " not found!");
      }
    };
  }

  update(dt: number): void {
   
    this.currentAction.update(dt);
  }

  private transitionToAction<A extends DuckWalkActionTag>(
    tag: A,
    ...args: DuckWalkActionSpec[A]["args"]
  ) {
    this.currentAction = createAction(tag, ...args);
    this.currentAction.init();
  }
}
