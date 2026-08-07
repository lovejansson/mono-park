import { createAction, type Updatable } from "../actions.ts";
import {
  GoTo,
  SitOnGrass,
  type CommonActionSpec,
  type CommonUpdatable,
} from "../commonActions.ts";
import type Human from "../Human.ts";
import Path from "../lib/Path.ts";
import type { Direction, Vec2 } from "../lib/types.ts";
import { isSamePos, randomEl, randomInt } from "../lib/utils.ts";
import type Play from "../Play.ts";
import Timer, { ONE_MINUTE, THREE_SECONDS } from "../Timer.ts";
import type BallGame from "./BallGame.ts";

export default class PlayBall implements PlayBallUpdatable {
  static TAG: "play-ball" = "play-ball";
  readonly tag: "play-ball" = PlayBall.TAG;

  private currAction: PlayBallUpdatable | CommonUpdatable | null;
  private human: Human;
  private game: BallGame;
  private initGamePos: Vec2 | null;
  private timer: Timer;

  constructor(human: Human, game: BallGame, initGamePos: Vec2 | null = null) {
    this.currAction = null;
    this.human = human;
    this.game = game;
    this.timer = new Timer();
    this.initGamePos = initGamePos;
  }

  init() {
    const playerArea = this.game.getPlayerArea(this.human.id);

    if (this.initGamePos) {
      this.human.direction = playerArea.direction;

      if (
        !this.human.animations.isPlaying(`idle-stand-${this.human.direction}`)
      ) {
        this.human.animations.play(`idle-stand-${this.human.direction}`);
      }
      (this.human.scene as Play).occupyCell(this.human.pos);
      this.timer.start(ONE_MINUTE * randomInt(1, 2));

      if (this.game.hasGotBall(this.human.id)) {
        this.transitionToAction(Pass.TAG, this.human, this.game);
      } else {
        this.transitionToAction(WaitForPass.TAG, this.human, this.game);
      }
    } else {
      const gamePos = { ...randomEl(playerArea.positions)! };
      this.transitionToAction(GoTo.TAG, this.human, gamePos);
    }
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${PlayBall.TAG} not initialized! Call init().`);

    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case GoTo.TAG:
          const playerArea = this.game.getPlayerArea(this.human.id);
          this.human.direction = playerArea.direction;

          if (
            !this.human.animations.isPlaying(
              `idle-stand-${this.human.direction}`,
            )
          ) {
            this.human.animations.play(`idle-stand-${this.human.direction}`);
          }

          (this.human.scene as Play).occupyCell(this.human.pos);

          this.game.playerHasExchanged();
          this.transitionToAction(WaitForPass.TAG, this.human, this.game);
          this.timer.start(ONE_MINUTE * randomInt(1, 2));

          break;

        case WaitForPass.TAG:
          this.transitionToAction(Pass.TAG, this.human, this.game);
          break;
        case Pass.TAG:
          if (this.timer.isStopped && this.game.canQuit()) {
            (this.human.scene as Play).unoccupyCell(this.human.pos);
            this.game.quit(this.human.id);
            return;
          }

          this.transitionToAction(WaitForPass.TAG, this.human, this.game);
          break;
      }
    }

    this.currAction.update(dt);
  }

  isComplete(): boolean {
    return !this.game.isPlaying(this.human.id);
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
  private human: Human;
  private game: BallGame;
  private path: Path | null;
  private gotPassed: boolean;

  constructor(human: Human, game: BallGame) {
    this.human = human;
    this.game = game;
    this.path = null;
    this.gotPassed = false;
  }

  init(): void {}

  update(dt: number): void {
    if (this.game.hasGotBall(this.human.id)) {
      const playerAreaDirection = this.game.getPlayerArea(
        this.human.id,
      ).direction;
      const passTargetPos = this.game.getPassTargetPos(this.human.id);

      if (passTargetPos === null) {
        throw new Error(
          `Pass target pos is null for player id ${this.human.id}. Pass target must be set in BallGame.pass().`,
        );
      }

      if (this.path !== null) {
        this.path.update(dt);
        if (!this.human.animations.isPlaying(`walk-${this.human.direction}`)) {
          this.human.animations.play(`walk-${this.human.direction}`);
        }
        if (this.path.hasReachedGoal) {
          this.path.finish();
          this.path = null;
          this.human.animations.play(
            `idle-stand-${this.game.getPlayerArea(this.human.id).direction}`,
          );
          this.human.direction = this.game.getPlayerArea(
            this.human.id,
          ).direction;
          (this.human.scene as Play).occupyCell(this.human.pos);
          this.gotPassed = true;
        }
        return;
      }

      if (isSamePos(this.human.pos, passTargetPos)) {
        this.human.animations.play(`idle-stand-${playerAreaDirection}`);
        (this.human.scene as Play).occupyCell(this.human.pos);
        this.gotPassed = true;
        return;
      }

      (this.human.scene as Play).unoccupyCell(this.human.pos);

      this.path = new Path(
        this.human,
        passTargetPos,
        (this.human.scene as Play).parkGrid,
      );

      this.path.start();
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
  private human: Human;
  private timer: Timer;
  private game: BallGame;

  constructor(human: Human, game: BallGame) {
    this.human = human;
    this.game = game;
    this.hasPassedBall = false;
    this.hasTriggeredPass = false;
    this.passDirection = "s";
    this.timer = new Timer();
  }

  init(): void {
    this.timer.start(THREE_SECONDS);
    this.passDirection = this.game.getPlayerArea(this.human.id).direction;
    this.human.animations.play(`idle-stand-${this.passDirection}`);
  }

  update(_: number): void {
    if (this.timer.isStopped && !this.hasTriggeredPass) {
      this.human.animations.play(`shoot-${this.passDirection}`);
      this.game.pass(this.game.getRandomPlayer(this.human.id));
      this.hasTriggeredPass = true;
      return;
    }

    if (
      this.hasTriggeredPass &&
      !this.human.animations.isPlaying(`shoot-${this.passDirection}`)
    ) {
      this.human.animations.play(`idle-stand-${this.passDirection}`);
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
  private human: Human;
  private game: BallGame;
  private chillPos: Vec2;

  constructor(human: Human, game: BallGame) {
    this.currAction = null;
    this.human = human;
    this.game = game;
    this.chillPos = this.game.getChillPos();
  }

  init() {
    this.transitionToAction(GoTo.TAG, this.human, this.chillPos);
  }

  update(dt: number): void {
    if (this.currAction === null)
      throw new Error(`State ${Chillin.TAG} not initialized! Call init().`);

    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case GoTo.TAG:
          (this.human.scene as Play).occupyCell(this.human.pos);
          this.game.playerHasExchanged();
          this.transitionToAction(SitOnGrass.TAG, this.human, "s", ONE_MINUTE);
          break;
        case SitOnGrass.TAG:
          if (this.game.canEnter()) {
            (this.human.scene as Play).unoccupyCell(this.human.pos);
            this.game.enter(this.human.id);
            this.game.returnChillPos(this.chillPos);
          }

          break;
      }
    }

    this.currAction.update(dt);
  }

  isComplete(): boolean {
    return this.game.isPlaying(this.human.id);
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
