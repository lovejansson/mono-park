import { createAction, type Updatable } from "../actions.ts";
import {
  GoTo,
  SitOnGrass,
  type CommonActionSpec,
  type CommonUpdatable,
} from "../commonActions.ts";

import { GroundArea } from "../lib/Grid.ts";
import Path from "../lib/Path.ts";
import type { Direction, Vec2 } from "../lib/types.ts";
import { isSamePos, randomEl, randomInt } from "../lib/utils.ts";
import type Play from "../Play.ts";
import Timer, { ONE_MINUTE, TEN_SECONDS, THREE_SECONDS } from "../Timer.ts";
import type Baller from "./Baller.ts";
import type BallGame from "./BallGame.ts";

export default class PlayBall implements PlayBallUpdatable {
  static TAG: "play-ball" = "play-ball";
  readonly tag: "play-ball" = PlayBall.TAG;

  private currAction: PlayBallUpdatable | CommonUpdatable | null;
  private baller: Baller;
  private game: BallGame;
  private timer: Timer;

  private initPos?: Vec2;

  constructor(baller: Baller, game: BallGame, initPos?: Vec2) {
    this.currAction = null;
    this.baller = baller;
    this.game = game;
    this.timer = new Timer();
    this.initPos = initPos;
  }

  init() {
    // The player has already entered the game here so we either they either have to go to the position or is already there.

    if (this.initPos !== undefined) {
      if (
        !this.baller.animations.isPlaying(`idle-stand-${this.baller.direction}`)
      ) {
        this.baller.animations.play(`idle-stand-${this.baller.direction}`);
      }
      if (this.game.hasGotBall(this.baller.id)) {
        this.transitionToAction(Pass.TAG, this.baller, this.game);
      } else {
        this.transitionToAction(WaitForPass.TAG, this.baller, this.game);
      }
      this.timer.start(TEN_SECONDS * randomInt(1, 2));
    } else {
      const playerArea = this.game.getPlayerArea(this.baller.id);
      const gamePos = randomEl(playerArea.positions)!;
      this.transitionToAction(
        GoTo.TAG,
        this.baller,
        gamePos,
        [GroundArea.GRASS],
        this.game.getOtherPlayerPositions(this.baller.id),
      );
    }
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${PlayBall.TAG} not initialized! Call init().`);

    this.currAction.update(dt);

    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case GoTo.TAG:
          // Player walked to the player area position

          const playerArea = this.game.getPlayerArea(this.baller.id);
          this.baller.direction = playerArea.direction;
          this.game.playerHasExchanged(this.baller.id);

          if (
            !this.baller.animations.isPlaying(
              `idle-stand-${this.baller.direction}`,
            )
          ) {
            this.baller.animations.play(`idle-stand-${this.baller.direction}`);
          }

          this.transitionToAction(WaitForPass.TAG, this.baller, this.game);
          this.timer.start(TEN_SECONDS * randomInt(1, 4));
          break;

        case WaitForPass.TAG:
          this.transitionToAction(Pass.TAG, this.baller, this.game);
          break;
        case Pass.TAG:
          if (
            this.timer.isStopped &&
            this.game.canQuit() &&
            this.game.hasChillPos()
          ) {
            this.game.quit(this.baller.id);
            this.game.setPlayerInExchange(this.baller.id);
            return;
          }
          this.transitionToAction(WaitForPass.TAG, this.baller, this.game);
          break;
      }
    }
  }

  isComplete(): boolean {
    return !this.game.isPlaying(this.baller.id);
  }

  private transitionToAction<
    A extends keyof (CommonActionSpec & PlayBallActionSpec),
  >(tag: A, ...args: (PlayBallActionSpec & CommonActionSpec)[A]["args"]) {
    this.currAction = createAction(tag, ...args);
    this.currAction.init();
  }
}

class WaitForPass implements PlayBallUpdatable {
  static TAG: "wait-for-pass" = "wait-for-pass";
  readonly tag: "wait-for-pass" = WaitForPass.TAG;
  private baller: Baller;
  private game: BallGame;
  private path: Path | null;
  private gotPassed: boolean;

  constructor(baller: Baller, game: BallGame) {
    this.baller = baller;
    this.game = game;
    this.path = null;
    this.gotPassed = false;
  }

  init(): void {}

  update(dt: number): void {
    const playerAreaDirection = this.game.getPlayerArea(
      this.baller.id,
    ).direction;

    // if the player got the ball (got passed) and should walk to the target pos if not there, else complete
    if (this.game.hasGotBall(this.baller.id)) {
      const passTargetPos = this.game.getPassTargetPos(this.baller.id);

      // Player started walking to the pass target pos
      if (this.path !== null) {
        this.path.update(dt);
        if (
          !this.baller.animations.isPlaying(`walk-${this.baller.direction}`)
        ) {
          this.baller.animations.play(`walk-${this.baller.direction}`);
        }

        if (this.path.hasReachedGoal) {
          this.path.finish();
          this.path = null;
          this.baller.animations.play(
            `idle-stand-${this.game.getPlayerArea(this.baller.id).direction}`,
          );
          this.baller.direction = playerAreaDirection;
          this.gotPassed = true;
        }
        return;
      }

      // Player is at the pass target position
      if (isSamePos(this.baller.pos, passTargetPos)) {
        this.baller.animations.play(`idle-stand-${playerAreaDirection}`);
        this.gotPassed = true;
        return;
      }

      try {
        this.path = new Path(this.baller, passTargetPos, [GroundArea.GRASS]);

        this.path.start();
      } catch (e) {
        console.log(
          "Tried to create path to the ball but a target tile was occupied",
        );
      }
    }
  }

  isComplete(): boolean {
    return this.gotPassed;
  }
}

class Pass implements PlayBallUpdatable {
  static TAG: "pass" = "pass";
  readonly tag: "pass" = Pass.TAG;
  private hasPassedBall: boolean;
  private hasTriggeredPass: boolean;
  private passDirection: Direction;
  private baller: Baller;
  private timer: Timer;
  private game: BallGame;

  constructor(baller: Baller, game: BallGame) {
    this.baller = baller;
    this.game = game;
    this.hasPassedBall = false;
    this.hasTriggeredPass = false;
    this.passDirection = "s";
    this.timer = new Timer();
  }

  init(): void {
    this.timer.start(THREE_SECONDS);
    this.passDirection = this.game.getPlayerArea(this.baller.id).direction;
    this.baller.animations.play(`idle-stand-${this.passDirection}`);
  }

  update(_: number): void {
    if (this.timer.isStopped && !this.hasTriggeredPass) {
      this.baller.animations.play(`shoot-${this.passDirection}`);
      this.game.pass(this.game.getPlayerToPassTo(this.baller.id));
      this.hasTriggeredPass = true;
      return;
    }

    if (
      this.hasTriggeredPass &&
      !this.baller.animations.isPlaying(`shoot-${this.passDirection}`)
    ) {
      this.baller.animations.play(`idle-stand-${this.passDirection}`);
      this.hasPassedBall = true;
    }
  }

  isComplete(): boolean {
    return this.hasPassedBall;
  }
}

export class Chillin implements PlayBallUpdatable {
  static TAG: "chillin" = "chillin";
  readonly tag: "chillin" = Chillin.TAG;

  private currAction: PlayBallUpdatable | Updatable | null;
  private baller: Baller;
  private game: BallGame;
  private chillPos: Vec2;

  constructor(baller: Baller, game: BallGame, initPos?: Vec2) {
    this.currAction = null;
    this.baller = baller;
    this.game = game;
    this.chillPos = initPos ?? this.game.getChillPos(baller.id);
  }

  init() {
    if (isSamePos(this.chillPos, this.baller.pos)) {
      this.transitionToAction(SitOnGrass.TAG, this.baller, "s", TEN_SECONDS);
    } else {
      this.transitionToAction(
        GoTo.TAG,
        this.baller,
        this.chillPos,
        [GroundArea.GRASS],
        this.game.getOtherPlayerPositions(this.baller.id),
      );
    }
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${Chillin.TAG} not initialized! Call init().`);
    this.currAction.update(dt);
    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case GoTo.TAG:
          this.game.playerHasExchanged(this.baller.id);
          this.transitionToAction(
            SitOnGrass.TAG,
            this.baller,
            "s",
            TEN_SECONDS,
          );
          break;
        case SitOnGrass.TAG:
          if (this.game.canEnter()) {
            this.game.enter(this.baller.id);
            this.game.setPlayerInExchange(this.baller.id);
          }
          break;
      }
    }
  }

  isComplete(): boolean {
    return this.game.isPlaying(this.baller.id);
  }

  private transitionToAction<
    A extends keyof (CommonActionSpec & PlayBallActionSpec),
  >(tag: A, ...args: (CommonActionSpec & PlayBallActionSpec)[A]["args"]) {
    this.currAction = createAction(tag, ...args);
    this.currAction.init();
  }
}

export interface PlayBallUpdatable extends Updatable {
  readonly tag: PlayBallActionTag;
}

const spec = {
  "play-ball": { ctor: PlayBall },
  "wait-for-pass": { ctor: WaitForPass },
  pass: { ctor: Pass },
  chillin: { ctor: Chillin },
} as const;

export type PlayBallActionTag = keyof PlayBallActionSpec;

export type PlayBallActionSpec = {
  [K in keyof typeof spec]: {
    args: ConstructorParameters<(typeof spec)[K]["ctor"]>;
    result: InstanceType<(typeof spec)[K]["ctor"]>;
  };
};

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor]),
) as { [K in PlayBallActionTag]: (typeof spec)[K]["ctor"] };
