import { type ActionTag } from "../actions";
import Fika from "../cafe/Fika";
import type Group from "../Group";
import Human from "../Human";
import { randomEl } from "../lib";
import type { Vec2 } from "../lib/types";
import Play from "../Play";
import type BallGame from "./BallGame";
import PlayBall, { Chillin } from "./PlayBall";

export enum PositionUpdateType {
  VEL,
  DELTA,
}

export default class Baller extends Human {
  static WALK_SPEED = 1;

  private game: BallGame;
  private initAction: ActionTag;

  constructor(
    scene: Play,
    pos: Vec2,
    name: string,
    initAction: ActionTag,
    game: BallGame,
    group: Group
  ) {
    super(scene, pos, name, group);
    this.initAction = initAction;
    this.game = game;
  }

  init(): void {
    super.init();
    this.animations.registerSpritesheet(`${this.name}-baller`);
    switch (this.initAction) {
      case Fika.TAG:
        break;
      case PlayBall.TAG:
        this.game.enter(this.id);
     
        const playerArea = this.game.getPlayerArea(this.id);

        const gamePos = { ...randomEl(playerArea.positions)! };

        this.pos = { ...gamePos };

        this.game.setPlayerWithBall(this.id);

        this.transitionToAction(PlayBall.TAG, this, this.game, { ...gamePos });
        break;
      case Chillin.TAG:
        this.transitionToAction(Chillin.TAG, this, this.game);
        break;
      default:
        throw new Error("Invalid state for baller");
    }
  }

  update(dt: number): void {
    if (this.currentAction.isComplete()) {
      switch (this.currentAction.tag) {
        case Fika.TAG:
          this.transitionToAction(PlayBall.TAG, this, this.game);
          break;
        case PlayBall.TAG:
          this.transitionToAction(Chillin.TAG, this, this.game);
          break;
        case Chillin.TAG:
          this.transitionToAction(PlayBall.TAG, this, this.game);
          break;
        default:
          throw new Error("Invalid state for baller");
      }
    }

    this.currentAction.update(dt);
  }
}
