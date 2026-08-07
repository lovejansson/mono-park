import {
  createAction,
  type ActionSpec,
  type ActionTag,
  type Updatable,
} from "./actions";
import type Group from "./Group";

import {  Sprite } from "./lib";
import type { OverlayOptions } from "./lib";
import type { Direction, Vec2 } from "./lib/types";
import type Play from "./Play";

export enum PositionUpdateType {
  VEL,
  DELTA,
}

export default class Human extends Sprite {
  static WALK_SPEED = 1;

  name: string;
  tileSize: number;
  action: ActionTag | null;
  currentAction!: Updatable;
  group: Group;

  constructor(
    scene: Play,
    pos: Vec2,
    name: string,
    group: Group
  ) {
    super(scene, pos, 16, 32, "s" );
    this.name = name;
    this.tileSize = scene.art!.tileSize;
    this.action = null;
    this.drawOffset.y = -this.tileSize;
      this.group = group;
  }

  init(): void {
    this.animations.registerSpritesheet("foods");

    this.animations.registerSpritesheet(`${this.name}-base`, {
      defaults: REPEAT_DEFAULTS,
    });

    this.animations.play("idle-stand-" + this.direction);

    this.animations.onFrameChange = (anim: string) => {
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

  isIdle(): boolean  {
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

export function getFoodOverlay(
  direction: Direction,
  food: string,
): OverlayOptions {
  switch (direction) {
    case "n":
      return {
        name: food,
        drawOnTop: false,
        drawBehind: true,
        dy: 0,
        dx: 0,
      };
    case "e":
      return {
        name: food,
        drawOnTop: false,
        drawBehind: true,
        dy: 3,
        dx: 6,
      };
    case "s":
      return {
        name: food,
        drawOnTop: true,
        drawBehind: false,
        dy: 6,
        dx: 0,
      };
    case "w":
      return {
        name: food,
        drawOnTop: false,
        drawBehind: true,
        dy: 3,
        dx: -5,
      };
  }

  throw Error("DIRECTION ERROR");
}
