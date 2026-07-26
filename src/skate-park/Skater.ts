import type { ActionTag } from "../actions.ts";
import { Sprite } from "../lib";
import type { OverlayOptions } from "../lib";
import type { Direction, Vec2 } from "../lib/types";
import type Play from "../Play.ts";
import SkatingAtPark from "./SkatePark.ts";

type Skill = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const PositionUpdateType = {
  Vel: "vel",
  Delta: "delta",
} as const;

type PositionUpdateType =
  (typeof PositionUpdateType)[keyof typeof PositionUpdateType];

type AnimationSetting = {
  positionUpdateType: PositionUpdateType;
  repeat: number | boolean;
  isAnim: boolean;
};

const Motions: Record<string, { dx: number; dy: number }[]> = {
  "cruise-ramp": [
    { dx: 7, dy: 9 },
    { dx: 9, dy: 14 },
    { dx: 12, dy: 6 },
    { dx: 18, dy: 4 },
    { dx: 16, dy: 0 },
    { dx: 18, dy: -4 },
    { dx: 12, dy: -6 },
    { dx: 9, dy: -14 },
    { dx: 7, dy: -9 },
    { dx: 0, dy: 0 },
  ],

  "cruise-bowl-h": [
    { dx: 2, dy: 4 },
    { dx: 8, dy: 6 },
    { dx: 12, dy: 4 },
    { dx: 16, dy: 2 },
    { dx: 36, dy: 0 },
    { dx: 16, dy: -2 },
    { dx: 12, dy: -4 },
    { dx: 8, dy: -6 },
    { dx: 2, dy: -4 },
  ],
  "cruise-bowl-s": [
    { dx: 0, dy: 8 },
    { dx: 0, dy: 24 },
    { dx: 0, dy: 16 },
    { dx: 0, dy: 16 },
    { dx: 0, dy: 16 },
    { dx: 0, dy: 24 },
    { dx: 0, dy: 8 },
  ],

  "cruise-bowl-n": [
    { dx: 0, dy: -8 },
    { dx: 0, dy: -24 },
    { dx: 0, dy: -16 },
    { dx: 0, dy: -16 },
    { dx: 0, dy: -16 },
    { dx: 0, dy: -24 },
    { dx: 0, dy: -8 },
  ],

  "jump-flat": [
    { dx: 0, dy: 4 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: -4 },
  ],
  "jump-up-e": [{ dx: 4, dy: -8 }],
  "jump-down-e": [{ dx: 8, dy: 8 }],
  "jump-up-w": [{ dx: -4, dy: -8 }],
  "jump-down-w": [{ dx: -8, dy: 8 }],

  "kickflip-f": Array(2).fill({ dx: -4, dy: 0 }),
  "kickflip-b": Array(2).fill({ dx: 4, dy: 0 }),
  "shove-it-f": Array(4).fill({ dx: -2, dy: 0 }),
  "shove-it-b": Array(4).fill({ dx: 2, dy: 0 }),
};

export default class Skater extends Sprite {
  static CRUISE_SPEED = 4;
  static GRIND_SPEED = 4;
  static TRICK_SPEED = 4;
  static WALK_SPEED = 1;

  skill: Skill;
  who: string;
  skatingAtPark: SkatingAtPark;
  tileSize: number;
  obstacle: number | null;
  bench: number | null;
  action: ActionTag | null;
  initAction: ActionTag;

  constructor(
    scene: Play,
    pos: Vec2,
    who: string,
    skill: Skill,
    initAction: ActionTag,
  ) {
    super(scene, pos, 16, 32, "s");

    this.tileSize = scene.art!.tileSize;
    this.drawOffset.y = -this.tileSize;
    this.initAction = initAction;

    this.who = who;
    this.skill = skill;
    this.action = null;

    this.animations.registerSpritesheet(`${who}-skater`, {
      defaults: REPEAT_DEFAULTS,
    });

    this.animations.registerSpritesheet(`${who}-base`, {
      defaults: REPEAT_DEFAULTS,
    });

    this.animations.onFrameChange = (
      anim: string,
      currentFrame: number,
      totalFrames: number,
      loopCount: number,
    ) => {
      const updateType = AnimationPositionUpdates[anim];

      // console.log("ANIMATION CHANGE ", anim)

      switch (updateType) {
        case PositionUpdateType.Delta:
          const motion = getAnimationMotion(anim);
          if (!motion) throw new Error("Motion data not found for " + anim);

          const motionIndex =
            currentFrame + loopCount * Math.max(totalFrames, 1);
          const delta = motion[motionIndex];

          if (!delta)
            throw new Error(
              `Delta not found for animation ${anim} frame ${currentFrame}.`,
            );

          this.pos.x += delta.dx;
          this.pos.y += delta.dy;

          break;
        case PositionUpdateType.Vel:
          //  console.log("UPDATING POS ", )
          //           console.log(posToCell(this.pos, this.tileSize))
          // if(this.path.isOnPath && this.path.hasReachedGoal){
          //   console.log("WANT TO UPDATE ANIM BUT HAS REACHED DESTINATION")
          //   console.log(posToCell(this.pos, this.tileSize))
          //   return;
          // }

          let speed = 0;

          if (
            anim.includes("idle") ||
            anim.startsWith("flip") ||
            anim.includes("prep")
          ) {
            this.vel.y = 0;
            this.vel.x = 0;
          } else if (anim.includes("cruise")) {
            speed = Skater.CRUISE_SPEED;
            switch (this.direction) {
              case "n":
                this.vel.y = -speed;
                this.vel.x = 0;
                break;
              case "e":
                this.vel.x = speed;
                this.vel.y = 0;
                break;
              case "s":
                this.vel.y = speed;
                this.vel.x = 0;
                break;
              case "w":
                this.vel.x = -speed;
                this.vel.y = 0;
                break;
            }
          } else if (anim.includes("grind")) {
            speed = Skater.GRIND_SPEED;

            switch (this.direction) {
              case "n":
                this.vel.y = -speed;
                this.vel.x = 0;
                break;
              case "e":
                this.vel.x = speed;
                this.vel.y = 0;
                break;
              case "s":
                this.vel.y = speed;
                this.vel.x = 0;
                break;
              case "w":
                this.vel.x = -speed;
                this.vel.y = 0;
                break;
            }
          } else if (anim.includes("walk")) {
            speed = Skater.WALK_SPEED;
            switch (this.direction) {
              case "n":
                this.vel.y = -speed;
                this.vel.x = 0;
                break;
              case "e":
                this.vel.x = speed;
                this.vel.y = 0;
                break;
              case "s":
                this.vel.y = speed;
                this.vel.x = 0;
                break;
              case "w":
                this.vel.x = -speed;
                this.vel.y = 0;
                break;
            }
          } else if (
            anim.includes("kickflip") ||
            anim.includes("shove-it") ||
            anim.includes("ollie") ||
            anim.includes("360") ||
            anim.includes("180") ||
            anim.includes("180")
          ) {
            if (this.action === "rail-tricks") {
              speed = Skater.TRICK_SPEED;
              switch (this.direction) {
                case "n":
                  this.vel.y = -speed;
                  this.vel.x = 0;
                  break;
                case "e":
                  this.vel.x = speed;
                  this.vel.y = 0;
                  break;
                case "s":
                  this.vel.y = speed;
                  this.vel.x = 0;
                  break;
                case "w":
                  this.vel.x = -speed;
                  this.vel.y = 0;
                  break;
              }
            } else {
              this.vel.y = 0;
              this.vel.x = 0;
            }
          }

          this.pos.x += this.vel.x;
          this.pos.y += this.vel.y;

          break;
      }
    };

    this.animations.onLoop = (anim: string, loopCount: number) => {
      // console.log("LOOP", animation, loopCount);
    };

    this.animations.onComplete = (animation: string) => {
      // console.log("COMPLETE", animation);
    };

    this.skatingAtPark = new SkatingAtPark(this);

    this.obstacle = null;
    this.bench = null;
  }

  update(dt: number): void {
    this.skatingAtPark.update(dt);
  }
}

export function getBoardFlipOverlay(
  direction: Direction,
): OverlayOptions | undefined {
  switch (direction) {
    case "n":
      return {
        name: "flip-board-n",
        drawOnTop: false,
        drawBehind: true,
        dy: 0,
        dx: 0,
      };
    case "e":
      return {
        name: "flip-board-e",
        drawOnTop: false,
        drawBehind: true,
        dy: 3,
        dx: 8,
      };
    case "s":
      return {
        name: "flip-board-s",
        drawOnTop: true,
        drawBehind: false,
        dy: 13,
        dx: 0,
      };
    case "w":
      return {
        name: "flip-board-w",
        drawOnTop: false,
        drawBehind: true,
        dy: 3,
        dx: -8,
      };
  }
}

export function getBoardCarryOverlay(
  direction: Direction,
  isIdle: boolean = false,
): OverlayOptions | undefined {
  switch (direction) {
    case "n":
      return {
        name: `board-carry-${isIdle ? "idle-" : ""}r`,
        drawOnTop: false,
        drawBehind: true,
        dy: 5,
        dx: 1,
      };
    case "ne":
      break;
    case "e":
      return {
        name: `board-carry-${isIdle ? "idle-" : ""}c`,
        drawOnTop: true,
        drawBehind: false,
        dy: -1,
        dx: 0,
      };
    case "se":
    case "s":
      return {
        name: `board-carry-${isIdle ? "idle-" : ""}l`,
        drawOnTop: false,
        drawBehind: true,
        dy: 5,
        dx: -1,
      };
    case "sw":
    case "w":
      return {
        name: `board-carry-${isIdle ? "idle-" : ""}c`,
        drawOnTop: false,
        drawBehind: true,
        dy: -2,
        dx: 0,
      };
    case "nw":
  }
}

const AnimationSettings: Record<string, AnimationSetting> = {
  "walk-n": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-s": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "walk-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-board-n": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-board-s": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-board-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "walk-board-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-sit-n": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-sit-s": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-n": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-s": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "idle-stand-board-n": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "idle-stand-board-s": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "prep-n": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },

  "prep-s": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },

  "flip-n": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "flip-s": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "flip-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "flip-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },

  "180-f": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "180-b": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "360-f": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "360-b": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },

  "180-e-cw": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "180-e-ccw": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "180-w-cw": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "180-w-ccw": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "360-e-cw": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "360-e-ccw": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "360-w-cw": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "360-w-ccw": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },

  "grab-f": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "grab-b": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "grab-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "grab-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "kickflip-f": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "kickflip-b": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "shove-it-f": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "shove-it-b": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "ollie-f": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "ollie-b": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: false,
    isAnim: true,
  },
  "nose-grind-f-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "nose-grind-b-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "nose-grind-f-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "nose-grind-b-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "cruise-n": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "cruise-s": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "cruise-f-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "cruise-f-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "cruise-b-e": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "cruise-b-w": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },

  "cruise-ramp-f-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-ramp-f-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-ramp-b-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-ramp-b-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "cruise-bowl-f-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-bowl-f-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-bowl-b-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "cruise-bowl-b-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "cruise-bowl-s-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: 7,
    isAnim: true,
  },
  "cruise-bowl-n-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: 7,
    isAnim: true,
  },

  "cruise-bowl-s-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: 7,
    isAnim: true,
  },
  "cruise-bowl-n-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: 7,
    isAnim: true,
  },

  "jump-up-f-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-up-b-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-up-f-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-up-b-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-down-f-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-down-b-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-down-f-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "jump-down-b-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  "ramp-land-w": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },
  "ramp-land-e": {
    positionUpdateType: PositionUpdateType.Delta,
    repeat: false,
    isAnim: true,
  },

  // Time + movement sync
  "climb-up": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
  "climb-down": {
    positionUpdateType: PositionUpdateType.Vel,
    repeat: true,
    isAnim: true,
  },
};

const AnimationPositionUpdates = Object.fromEntries(
  Object.entries(AnimationSettings)
    .filter(([, settings]) => settings.isAnim)
    .map(([name, settings]) => [name, settings.positionUpdateType]),
) as Partial<Record<string, PositionUpdateType>>;

const REPEAT_DEFAULTS = Object.fromEntries(
  Object.entries(AnimationSettings)
    .filter(([, settings]) => settings.isAnim)
    .map(([name, settings]) => [name, { repeat: settings.repeat }]),
) as Record<string, { repeat: number | boolean }>;

function getAnimationMotion(name: string): { dx: number; dy: number }[] | null {
  if (name.startsWith("cruise-ramp")) {
    const xDirMultiplier = name.includes("-w") ? -1 : 1;

    return Motions["cruise-ramp"].map(({ dx, dy }) => ({
      dx: dx * xDirMultiplier,
      dy,
    }));
  }

  if (name.startsWith("cruise-bowl")) {
    if (name.includes("-s-")) {
      return Motions["cruise-bowl-s"];
    }

    if (name.includes("-n-")) {
      return Motions["cruise-bowl-n"];
    }

    const xDirMultiplier = name.includes("-w") ? -1 : 1;

    return Motions["cruise-bowl-h"].map(({ dx, dy }) => ({
      dx: dx * xDirMultiplier,
      dy,
    }));
  }

  if (name.startsWith("ramp-land")) {
    return [{ dx: 0, dy: 0 }];
  }

  if (name.startsWith("jump")) {
    const direction = name.endsWith("-w")
      ? "w"
      : name.endsWith("-e")
        ? "e"
        : null;
    if (!direction) return null;

    const upDown = name.includes("up") ? "up" : "down";

    return Motions[`jump-${upDown}-${direction}`] ?? null;
  }

  return Motions[name] ?? null;
}
