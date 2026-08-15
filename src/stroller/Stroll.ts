import { createAction, type Updatable } from "../actions.ts";
import {
  GoTo,
  SitOnBench,
  SitOnGrass,
  StandIdle,
  type CommonActionSpec,
  type CommonUpdatable,
} from "../commonActions.ts";
import type Human from "../Human.ts";
import { GroundArea } from "../lib/Grid.ts";
import type { Direction, Vec2 } from "../lib/types.ts";
import { isSamePos } from "../lib/utils.ts";
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
      if (!this.human.group.startWalk(this.human.id)) {
        throw new Error("No stroll spot available for group");
      }
      this.strollSpot = this.human.group.getStrollSpot();
      this.assignNextSpotPos();

      this.blockSpotPositions();

      this.transitionToAction(GoTo.TAG, this.human, this.spotPos.pos, [
        GroundArea.GRASS,
        GroundArea.GRAVEL,
      ]);

      this.unblockSpotPositions();
      this.human.scene.grid.occupyTile(this.human.id, this.spotPos.pos);
    } else {
      this.strollSpot = this.human.group.getStrollSpot();
      this.assignNextSpotPos();
      this.blockSpotPositions();

      this.transitionToAction(GoTo.TAG, this.human, this.spotPos.pos, [
        GroundArea.GRASS,
        GroundArea.GRAVEL,
      ]);

      this.unblockSpotPositions();

      this.human.scene.grid.occupyTile(this.human.id, this.spotPos.pos);
    }
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${Stroll.TAG} not initialized! Call init().`);

    if (this.human.group.isWalking() && this.currAction.tag !== GoTo.TAG) {
      this.returnSpotPos();
      this.human.scene.grid.unoccupyTile(this.spotPos.pos);
      this.strollSpot = this.human.group.getStrollSpot();
      this.assignNextSpotPos();
      this.blockSpotPositions();

      if(this.currAction.tag === SitOnBench.TAG) {
        const bench = this.getScene().benches.find(b => !b.isAtSkatePark);
        if(bench === undefined) throw new Error("No bench found");
        this.human.pos.y = bench.pos.y + bench.height;

      }

      this.transitionToAction(GoTo.TAG, this.human, this.spotPos.pos, [
        GroundArea.GRASS,
        GroundArea.GRAVEL,
      ]);

      this.unblockSpotPositions();
      this.human.scene.grid.occupyTile(this.human.id, this.spotPos.pos);
      return;
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

          // this.getScene().grid.occupyTile(this.human.id, this.spotPos.pos);

          switch (this.strollSpot) {
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
              const pondBench = this.getScene().benches.find(
                (b) => !b.isAtSkatePark,
              );

              if (pondBench === undefined) {
                throw new Error("Pond bench not found");
              }

              this.transitionToAction(
                SitOnBench.TAG,
                this.human,
                pondBench,
                TEN_SECONDS * 3,
              );
              break;
          }
          break;

        case SitOnBench.TAG:
        case SitOnGrass.TAG:
        case StandIdle.TAG:
          if (!this.human.group.isWalking() && !this.getScene().groupIsStrolling) {
            if (!this.human.group.selectNextAvailableStrollSpot()) break;

            this.human.scene.grid.unoccupyTile(this.spotPos.pos);
            this.returnSpotPos();

            this.strollSpot = this.human.group.getStrollSpot();
            this.human.group.startWalk(this.human.id);
            this.assignNextSpotPos();
            this.blockSpotPositions();

            this.transitionToAction(GoTo.TAG, this.human, this.spotPos.pos, [
              GroundArea.GRASS,
              GroundArea.GRAVEL,
            ]);
            this.human.scene.grid.occupyTile(this.human.id, this.spotPos.pos);
            this.unblockSpotPositions();
          }
          break;
      }
    }

    this.currAction.update(dt);
  }

  isComplete(): boolean {
    return false;
  }

  private blockSpotPositions() {
    const positionsAtSpot = (this.human.scene as Play).getSpotPositions(
      this.strollSpot,
    );

    for (const p of positionsAtSpot) {
      if (!isSamePos(p, this.spotPos.pos)) {
        this.human.scene.grid.blockTile(p);
      }
    }
  }

  private unblockSpotPositions() {
    const positionsAtSpot = (this.human.scene as Play).getSpotPositions(
      this.strollSpot,
    );

    for (const p of positionsAtSpot) {
      if (!isSamePos(p, this.spotPos.pos)) {
        this.human.scene.grid.unBlockTile(p);
      }
    }
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
