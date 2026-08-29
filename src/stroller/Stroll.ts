import { createAction, type Updatable } from "../actions.ts";
import {
  GoTo,
  SittingOnBench,
  SitOnGrass,
  StandIdle,
  type CommonActionSpec,
  type CommonUpdatable,
} from "../commonActions.ts";
import type Human from "../Human.ts";
import { GroundArea } from "../lib/Grid.ts";
import type { Direction, Vec2 } from "../lib/types.ts";
import { isSamePos } from "../lib/utils.ts";
import Play from "../Play.ts";
import { TEN_SECONDS } from "../Timer.ts";
import { StrollSpot } from "./StrollPark.ts";

export default class Stroll implements StrollUpdatable {
  static TAG: "stroll" = "stroll";
  readonly tag: "stroll" = Stroll.TAG;
  private currAction: StrollUpdatable | CommonUpdatable | null;
  private human: Human;
  private strollSpot: StrollSpot;
  private spotPos!: { pos: Vec2; direction: Direction }; // initial spot is set in the init method
  private play: Play;

  constructor(human: Human) {
    this.currAction = null;
    this.human = human;
    this.strollSpot = this.human.group.getStrollSpot();
    this.play = this.human.scene as Play;
  }

  init() {
    this.strollSpot = this.human.group.getStrollSpot();

    this.spotPos = this.play.strollPark.getStrollPos(this.strollSpot);

    this.play.grid.occupyTile(this.human.id, this.spotPos.pos);

    this.human.pos.y = this.spotPos.pos.y;
    this.human.pos.x = this.spotPos.pos.x;
    this.human.direction = this.spotPos.direction;

    switch (this.strollSpot) {
      case StrollSpot.BRIDGE:
        this.human.animations.play(`idle-stand-${this.human.direction}`);
        this.transitionToAction(
          StandIdle.TAG,
          this.human,
          this.spotPos.direction,
          TEN_SECONDS * 3,
        );
        break;
      case StrollSpot.CACTUSES:
        this.human.animations.play(`idle-stand-${this.human.direction}`);
        this.transitionToAction(
          StandIdle.TAG,
          this.human,
          this.spotPos.direction,
          TEN_SECONDS * 3,
        );
        break;
      case StrollSpot.SKATE_GROUND:
        this.human.animations.play(`idle-stand-${this.human.direction}`);
        this.transitionToAction(
          StandIdle.TAG,
          this.human,
          this.spotPos.direction,
          TEN_SECONDS * 3,
        );
        break;
      case StrollSpot.GRASS_BY_THE_POND:
        this.human.animations.play(`idle-sit-${this.human.direction}`);
        this.transitionToAction(
          SitOnGrass.TAG,
          this.human,
          this.spotPos.direction,
          TEN_SECONDS * 3,
        );
        break;
      case StrollSpot.POND_BENCH:
        const pondBench = this.play.pondBench;

        if (pondBench === undefined) {
          throw new Error("Pond bench not found");
        }

        this.human.animations.play("idle-stand-n");
        this.transitionToAction(
          SittingOnBench.TAG,
          this.human,
          pondBench,
          TEN_SECONDS * 3,
        );
        break;
    }
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${Stroll.TAG} not initialized! Call init().`);

    this.currAction.update(dt);

    if (this.human.group.isWalking() && this.currAction.tag !== GoTo.TAG) {
      this.strollSpot = this.human.group.getStrollSpot();
      this.spotPos = this.play.strollPark.getStrollPos(this.strollSpot);

      if (this.currAction.tag === SittingOnBench.TAG) {
        const pondBench = this.play.pondBench;
        if (pondBench === undefined) throw new Error("No bench found");
        this.human.pos.y = pondBench.pos.y + pondBench.height;
      }

      const spotPositions = this.play.strollPark
        .getSpotPositions(this.strollSpot)
        .filter((p) => !isSamePos(p, this.spotPos.pos));

      this.transitionToAction(
        GoTo.TAG,
        this.human,
        this.spotPos.pos,
        [GroundArea.GRASS, GroundArea.GRAVEL, GroundArea.BRIDGE],
        spotPositions,
      );

      return;
    }

    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case GoTo.TAG:
          if (this.human.group.isWalking()) {
            this.human.group.stopWalk();
          }

          switch (this.strollSpot) {
            case StrollSpot.BRIDGE:
              this.transitionToAction(
                StandIdle.TAG,
                this.human,
                this.spotPos.direction,
                TEN_SECONDS * 3,
              );
              break;
            case StrollSpot.CACTUSES:
              this.transitionToAction(
                StandIdle.TAG,
                this.human,
                this.spotPos.direction,
                TEN_SECONDS * 3,
              );
              break;
            case StrollSpot.SKATE_GROUND:
              this.transitionToAction(
                StandIdle.TAG,
                this.human,
                this.spotPos.direction,
                TEN_SECONDS * 3,
              );
              break;
            case StrollSpot.GRASS_BY_THE_POND:
              this.transitionToAction(
                SitOnGrass.TAG,
                this.human,
                this.spotPos.direction,
                TEN_SECONDS * 3,
              );
              break;
            case StrollSpot.POND_BENCH:
              const pondBench = this.play.pondBench;

              if (pondBench === undefined) {
                throw new Error("Pond bench not found");
              }

              this.transitionToAction(
                SittingOnBench.TAG,
                this.human,
                pondBench,
                TEN_SECONDS * 3,
              );
              break;
          }
          break;

        case SittingOnBench.TAG:
        case SitOnGrass.TAG:
        case StandIdle.TAG:
          if (
            !this.human.group.isWalking() &&
            !this.play.strollPark.isParkBlocked()
          ) {
            this.human.group.startWalk(this.human.id);
            this.strollSpot = this.human.group.getStrollSpot();

            this.spotPos = this.play.strollPark.getStrollPos(this.strollSpot);

            const spotPositions = this.play.strollPark
              .getSpotPositions(this.strollSpot)
              .filter((p) => !isSamePos(p, this.spotPos.pos));

            this.transitionToAction(
              GoTo.TAG,
              this.human,
              this.spotPos.pos,
              [GroundArea.GRASS, GroundArea.GRAVEL, GroundArea.BRIDGE],
              spotPositions,
            );
          }
          break;
      }
    }
  }

  isComplete(): boolean {
    return false;
  }

  private transitionToAction<
    A extends keyof (CommonActionSpec & StrollActionSpec),
  >(tag: A, ...args: (StrollActionSpec & CommonActionSpec)[A]["args"]) {
    this.currAction = createAction(tag, ...args);
    this.currAction!.init();
  }
}

export interface StrollUpdatable extends Updatable {
  readonly tag: StrollActionTag;
}

const spec = {
  stroll: { ctor: Stroll },
} as const;

export type StrollActionTag = keyof StrollActionSpec;

export type StrollActionSpec = {
  [K in keyof typeof spec]: {
    args: ConstructorParameters<(typeof spec)[K]["ctor"]>;
    result: InstanceType<(typeof spec)[K]["ctor"]>;
  };
};

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor]),
) as { [K in StrollActionTag]: (typeof spec)[K]["ctor"] };
