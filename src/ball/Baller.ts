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
  private initBall: boolean;

  constructor(
    scene: Play,
    pos: Vec2,
    name: string,
    game: BallGame,
    group: Group,
    initBall: boolean = false,
  ) {
    super(scene, pos, name, group);
    this.game = game;
    this.initBall = initBall;
  }

  init(): void {
    super.init();

    this.animations.registerSpritesheet(`${this.name}-baller`);

    if (this.game.canEnter()) {
      this.game.enter(this.id);

      const playerArea = this.game.getPlayerArea(this.id);
      this.direction = playerArea.direction;
      const gamePos = { ...randomEl(playerArea.positions)! };
      this.pos = { ...gamePos };
      this.scene.grid.occupyTile(this.id, this.pos);
      if (this.initBall) {
        this.game.setPlayerWithBall(this.id);
      }
      this.transitionToAction(PlayBall.TAG, this, this.game, gamePos);
    } else {
      const pos = this.game.getChillPos(this.id);
      this.pos = { ...pos };
      this.scene.grid.occupyTile(this.id, this.pos);
      this.transitionToAction(Chillin.TAG, this, this.game, pos);
    }
  }

  update(dt: number): void {
    this.currentAction.update(dt);

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
  }
}
