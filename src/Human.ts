import type Play from "./Play";
import {
  createAction,
  type ActionSpec,
  type ActionTag,
  type Updatable,
} from "./actions";
import type Group from "./Group";

import { Sprite, type Direction, type OverlayOptions, type Vec2 } from "./lib";

export enum PositionUpdateType {
  VEL,
  DELTA,
}

export default class Human extends Sprite {
  static WALK_SPEED = 1;

  name: string;
  tileSize: number;
  action: ActionTag | null; // current most inner action that human is taking...
  currentAction!: Updatable; // current outer action for this human
  group: Group;

  constructor(scene: Play, pos: Vec2, name: string, group: Group) {
    super(scene, pos, 16, 32, "s");
    this.name = name;
    this.tileSize = scene.art!.tileSize;
    this.action = null;
    this.drawOffset.y = -this.tileSize;
    this.group = group;
  }

  init(): void {
    this.animations.registerSpritesheet(`${this.name}-base`, {
      defaults: REPEAT_DEFAULTS,
    });

    this.animations.onFrameChange = (anim: string) => {
      if (!(this.isOnActiveAnimationSequence() || this.isOnActivePath()))
        return;
      const updateType = AnimationPositionUpdates[anim];

      switch (updateType) {
        case PositionUpdateType.DELTA:
          throw new Error("Delta motion not applicable for 'Human'");
        case PositionUpdateType.VEL:
          if (anim.includes("idle")) {
            this.vel.y = 0;
            this.vel.x = 0;
          } else if (anim.includes("walk")) {
            switch (this.direction) {
              case "n":
                this.vel.y = -Human.WALK_SPEED;
                this.vel.x = 0;
                break;
              case "e":
                this.vel.x = Human.WALK_SPEED;
                this.vel.y = 0;
                break;
              case "s":
                this.vel.y = Human.WALK_SPEED;
                this.vel.x = 0;
                break;
              case "w":
                this.vel.x = -Human.WALK_SPEED;
                this.vel.y = 0;
                break;
            }

            this.pos.x += this.vel.x;
            this.pos.y += this.vel.y;
          } else {
            throw new Error("Animation " + anim + " not found!");
          }
          break;
      }
    };
  }

  update(dt: number): void {
    this.currentAction.update(dt);
  }

  isSitting(): boolean {
    const anim = this.animations.getPlaying();
    return anim !== null && anim.includes("idle-sit");
  }

  isIdle(): boolean {
    const anim = this.animations.getPlaying();
    return anim !== null && anim.includes("idle");
  }

  protected transitionToAction<A extends ActionTag>(
    tag: A,
    ...args: ActionSpec[A]["args"]
  ) {
    this.currentAction = createAction(tag, ...args);
    this.currentAction.init();
  }
}

export type AnimationSetting = {
  positionUpdateType: PositionUpdateType;
  repeat: number | boolean;
};

const AnimationSettings: Record<string, AnimationSetting> = {
  "walk-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-hold-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-hold-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-hold-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-hold-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-sit-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-sit-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-sit-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-sit-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-hold-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-hold-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-hold-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-hold-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "eat-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "eat-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "eat-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "eat-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
};

const AnimationPositionUpdates = Object.fromEntries(
  Object.entries(AnimationSettings).map(([name, settings]) => [
    name,
    settings.positionUpdateType,
  ]),
) as Partial<Record<string, PositionUpdateType>>;

const REPEAT_DEFAULTS = Object.fromEntries(
  Object.entries(AnimationSettings).map(([name, settings]) => [
    name,
    { repeat: settings.repeat },
  ]),
) as Record<string, { repeat: number | boolean }>;

export function getFikaOverlay(
  direction: Direction,
  food: string,
  fade?: boolean,
): OverlayOptions {
  switch (direction) {
    case "n":
      return {
        name: `${food}${fade ? "-fade" : ""}`,
        drawOnTop: false,
        drawBehind: true,
        dy: 25,
        dx: 5,
      };
    case "e":
      return {
        name: `${food}${fade ? "-fade" : ""}`,
        drawOnTop: false,
        drawBehind: true,
        dy: 25,
        dx: 10,
      };
    case "s":
      return {
        name: `${food}${fade ? "-fade" : ""}`,
        drawOnTop: true,
        drawBehind: false,
        dy: 25,
        dx: 5,
      };
    case "w":
      return {
        name: `${food}${fade ? "-fade" : ""}`,
        drawOnTop: false,
        drawBehind: true,
        dy: 25,
        dx: 1,
      };
  }

  throw Error("DIRECTION ERROR");
}
