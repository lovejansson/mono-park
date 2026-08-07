import { createAction, type Updatable } from "../actions.ts";
import {
  FollowTheLeader,
  GoTo,
  SitOnBench,
  SitOnGrass,
  StandIdle,
  type CommonActionSpec,
  type CommonUpdatable,
} from "../commonActions.ts";
import type Human from "../Human.ts";
import type { Direction, Vec2 } from "../lib/types.ts";
import Play, { StrollSpot } from "../Play.ts";
import { TEN_SECONDS } from "../Timer.ts";

export default class Stroll implements StrollUpdatable {
  static TAG: "stroll" = "stroll";
  readonly tag: "stroll" = Stroll.TAG;
  private currAction: StrollUpdatable | CommonUpdatable | null;
  private human: Human;
  private strollSpot: StrollSpot;
  private spotPos!: { pos: Vec2; direction: Direction }; // initial spot is set in the init method

  constructor(human: Human) {
    this.currAction = null;
    this.human = human;
    this.strollSpot = this.human.group.getStrollSpot();
  }

  init() {
    if (!this.human.group.isWalking()) {
      this.strollSpot = this.human.group.getStrollSpot();
      this.human.group.startWalk(this.human.id);
      this.assignNextSpotPos();
      this.transitionToAction(GoTo.TAG, this.human, this.spotPos.pos);
    } else {
      this.strollSpot = this.human.group.getStrollSpot();
      this.assignNextSpotPos();
      this.transitionToAction(FollowTheLeader.TAG, this.human);
    }
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${Stroll.TAG} not initialized! Call init().`);

    if (
      this.human.group.isWalking() &&
      this.currAction.tag !== FollowTheLeader.TAG &&
      this.currAction.tag !== GoTo.TAG
    ) {
      this.returnSpotPos();
      this.strollSpot = this.human.group.getStrollSpot();
      this.assignNextSpotPos();
      this.transitionToAction(FollowTheLeader.TAG, this.human);
    }

    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case GoTo.TAG:
          if (
            this.human.group.isWalking() &&
            this.human.group.getLeader() === this.human.id
          ) {
            this.human.group.stopWalk();
          }

          switch (this.strollSpot) {
            case StrollSpot.CACTUSES:
              this.getScene().occupyCell(this.human.pos);
              this.transitionToAction(
                StandIdle.TAG,
                this.human,
                this.spotPos.direction,
                TEN_SECONDS * 3,
              );
              break;
            case StrollSpot.SKATE_GROUND_LEFT:
              this.getScene().occupyCell(this.human.pos);
              this.transitionToAction(
                StandIdle.TAG,
                this.human,
                this.spotPos.direction,
                TEN_SECONDS * 3,
              );
              break;
            case StrollSpot.GRASS_BY_THE_POND:
              this.getScene().occupyCell(this.human.pos);
              this.transitionToAction(
                SitOnGrass.TAG,
                this.human,
                this.spotPos.direction,
                TEN_SECONDS * 3,
              );
              break;
          }
          break;
        case FollowTheLeader.TAG:
          this.transitionToAction(GoTo.TAG, this.human, this.spotPos.pos);
          break;
        case SitOnBench.TAG:
        case SitOnGrass.TAG:
        case StandIdle.TAG:
          if (!this.human.group.isWalking()) {
            this.getScene().unoccupyCell(this.human.pos);
            this.returnSpotPos();
            this.human.group.nextStrollSpot();
            this.strollSpot = this.human.group.getStrollSpot();
            this.human.group.startWalk(this.human.id);

            this.assignNextSpotPos();

            this.transitionToAction(GoTo.TAG, this.human, this.spotPos.pos);
          }
          break;
      }
    }

    this.currAction.update(dt);
  }

  isComplete(): boolean {
    return false;
  }

  private transitionToAction<
    A extends keyof (CommonActionSpec & StrollActionSpec),
  >(tag: A, ...args: (StrollActionSpec & CommonActionSpec)[A]["args"]) {
    this.currAction = createAction(tag, ...args);
    this.currAction.init();
  }

  private getScene(): Play {
    return this.human.scene as Play;
  }

  private returnSpotPos(): void {
    this.getScene().returnStrollPos(this.strollSpot, this.spotPos.pos);
  }

  private assignNextSpotPos(): void {
    this.spotPos = this.getScene().getStrollPos(this.strollSpot);
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
