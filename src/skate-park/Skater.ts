import type { ActionTag } from "../actions.ts";
import Human, { PositionUpdateType, type AnimationSetting } from "../Human.ts";
import type { OverlayOptions } from "../lib";
import type { Direction, Vec2 } from "../lib/types";
import type Play from "../Play.ts";
import SkatingAtPark from "./SkatePark.ts";

type Skill = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export default class Skater extends Human {
  static CRUISE_SPEED = 4;
  static GRIND_SPEED = 4;
  static TRICK_SPEED = 4;
  static WALK_SPEED = 1;

  skill: Skill;
  skatingAtPark: SkatingAtPark;
  obstacle: number | null;
  bench: number | null;

  constructor(
    scene: Play,
    pos: Vec2,
    name: string,
    skill: Skill,
    initAction: ActionTag,
  ) {
    super(scene, pos, name, initAction);

    this.skill = skill;
    this.skatingAtPark = new SkatingAtPark(this);
    this.obstacle = null;
    this.bench = null;
  }

  init(): void {
    this.animations.registerSpritesheet(`${this.name}-skater`, {
      defaults: REPEAT_DEFAULTS,
    });

    this.animations.registerSpritesheet(`${this.name}-base`, {
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
        case PositionUpdateType.DELTA:
          const motion = getAnimationMotion(anim);
          if (!motion) throw new Error("Motion data not found for " + anim);

          const motionIndex =
            currentFrame + loopCount * Math.max(totalFrames, 1);
          const delta = motion[motionIndex];

          if (!delta)
            throw new Error(
              `DELTA not found for animation ${anim} frame ${currentFrame}.`,
            );

          this.pos.x += delta.dx;
          this.pos.y += delta.dy;

          break;
        case PositionUpdateType.VEL:
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
          } else if (anim.includes("grind")) {
            speed = Skater.GRIND_SPEED;
          } else if (anim.includes("walk")) {
            speed = Skater.WALK_SPEED;
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
            } else {
              this.vel.y = 0;
              this.vel.x = 0;
            }
          }

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
  "walk-board-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-board-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-board-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "walk-board-w": {
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

  "idle-stand-board-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "idle-stand-board-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },

  "prep-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },

  "prep-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },

  "flip-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "flip-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "flip-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "flip-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },

  "180-f": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "180-b": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "360-f": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "360-b": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },

  "180-e-cw": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "180-e-ccw": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "180-w-cw": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "180-w-ccw": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "360-e-cw": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "360-e-ccw": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "360-w-cw": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "360-w-ccw": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },

  "grab-f": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "grab-b": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "grab-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "grab-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "kickflip-f": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "kickflip-b": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "shove-it-f": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "shove-it-b": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "ollie-f": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "ollie-b": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: false,
  },
  "nose-grind-f-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "nose-grind-b-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "nose-grind-f-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "nose-grind-b-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },

  "cruise-n": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "cruise-s": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },

  "cruise-f-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "cruise-f-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "cruise-b-e": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "cruise-b-w": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },

  "cruise-ramp-f-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },
  "cruise-ramp-f-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },
  "cruise-ramp-b-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },
  "cruise-ramp-b-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "cruise-bowl-f-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },
  "cruise-bowl-f-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },
  "cruise-bowl-b-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },
  "cruise-bowl-b-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "cruise-bowl-s-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: 7,
  },
  "cruise-bowl-n-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: 7,
  },

  "cruise-bowl-s-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: 7,
  },
  "cruise-bowl-n-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: 7,
  },

  "jump-up-f-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "jump-up-b-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "jump-up-f-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "jump-up-b-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "jump-down-f-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "jump-down-b-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "jump-down-f-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "jump-down-b-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  "ramp-land-w": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },
  "ramp-land-e": {
    positionUpdateType: PositionUpdateType.DELTA,
    repeat: false,
  },

  // Time + movement sync
  "climb-up": {
    positionUpdateType: PositionUpdateType.VEL,
    repeat: true,
  },
  "climb-down": {
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
