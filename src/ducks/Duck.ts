import { createAction } from "../actions";
import type { CommonActionTag, CommonUpdatable } from "../commonActions";
import { Sprite, type AnimationDefaults } from "../lib";
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
    // All duck animations have repeat infinitly
    const animations =
      this.scene.art.spritesheets.get("duck").data.meta.frameTags;
    const defaults: AnimationDefaults = {};
    for (const a of animations) {
      defaults[a.name] = { repeat: true };
    }
    this.animations.registerSpritesheet("duck", {
      defaults,
    });
    this.transitionToAction(DuckWalk.TAG, this);
    this.animations.onFrameChange = (
      anim: string,
      frame: number,
      _: number,
      loopCount: number,
    ) => {

      if (frame === 0 && loopCount === 0) return; // Frame 0 is a animation change so no movement is applied initially

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

/**
 *
 *
 * ankan ska pendla mellan att gå till idle spot och gå randomly,
 *
 * idle spot varar i x antal minuter och sen drar ankan
 *
 * innan idle kan hända måste man kolla på om det finns idle positions,
 *
 * duck walk i sig kan vara klart om en timer är klar + om det finns idle positions och isf start en path till idle pos. när det är klart så kan ankan bara börja gå därifrån randomly.
 *
 *
 *
 *
 */
