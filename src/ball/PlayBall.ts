import { createAction, type Updatable } from "../actions.ts";
import type Human from "../Human.ts";
import Path from "../lib/Path.ts";
import type { Direction } from "../lib/types.ts";
import { isSamePos, randomEl } from "../lib/utils.ts";
import type Play from "../Play.ts";
import Timer, { THREE_SECONDS } from "../Timer.ts";
import type { PlayerArea } from "./BallGame.ts";
import type BallGame from "./BallGame.ts";

export default class PlayBall implements PlayBallUpdatable {
  static TAG: "play-ball" = "play-ball";
  readonly tag: "play-ball" = PlayBall.TAG;

  private currAction: PlayBallUpdatable | null;
  private human: Human;
  private game: BallGame;
  private playerArea: PlayerArea;

  constructor(human: Human, game: BallGame, playerArea: PlayerArea) {
    this.currAction = null;
    this.human = human;
    this.playerArea = playerArea;
    this.game = game;
  }

  init() {
    this.human.direction = this.playerArea.direction;
    this.human.pos = { ...randomEl(this.playerArea.positions)! };
    this.human.animations.play(`idle-stand-${this.human.direction}`)
  }

  update(dt: number): void {
    if (this.currAction === null) {
      if (this.game.hasGotBall(this.human.id)) {
        this.transitionToAction(Pass.TAG, this.human, this.game);
      } else {
        this.transitionToAction(WaitForPass.TAG, this.human, this.game);
      }
    } else {
      if (this.currAction.isComplete()) {
        switch (this.currAction.tag) {
          case WaitForPass.TAG:
            this.transitionToAction(Pass.TAG, this.human, this.game);

            break;
          case Pass.TAG:
            this.transitionToAction(WaitForPass.TAG, this.human, this.game);
            break;
        }
      }

      this.currAction.update(dt);
    }
  }

  isComplete(): boolean {
    return false;
  }

  private transitionToAction<A extends PlayBallActionTag>(
    tag: A,
    ...args: PlayBallActionSpec[A]["args"]
  ) {
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
      const playerAreaDirection = this.game.getPlayerArea(this.human.id).direction;
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
           this.human.direction = this.game.getPlayerArea(this.human.id).direction;
          this.gotPassed = true;
        }
        return;
      }

      if (isSamePos(this.human.pos, passTargetPos)) {
        this.human.animations.play(`idle-stand-${playerAreaDirection}`);
        this.gotPassed = true;
        return;
      }

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

    if (this.hasTriggeredPass && !this.human.animations.isPlaying(`shoot-${this.passDirection}`)) {
      this.human.animations.play(`idle-stand-${this.passDirection}`);
      this.hasPassedBall = true;
    }
  }

  isComplete(): boolean {
    return this.hasPassedBall;
  }
}

export interface PlayBallUpdatable extends Updatable {
  readonly tag: PlayBallActionTag;
}

const spec = {
  "play-ball": { ctor: PlayBall },
  "wait-for-pass": { ctor: WaitForPass },
  pass: { ctor: Pass },
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
