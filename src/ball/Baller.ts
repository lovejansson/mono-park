import { type ActionTag } from "../actions";
import Fika from "../cafe/Fika";
import type GroupActivityCoordinator from "../GroupActivityCoordinator";
import Human from "../Human";
import type { OverlayOptions } from "../lib";
import type { Direction, Vec2 } from "../lib/types";
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
  ) {
    super(scene, pos, name);
    this.name = name;
    this.tileSize = scene.art!.tileSize;
    this.action = null;
    this.initAction = initAction;
    this.drawOffset.y = -this.tileSize;
    this.game = game;
  }

  init(): void {
    super.init();
    this.animations.registerSpritesheet(`${this.name}-baller`);
    switch (this.initAction) {
      case Fika.TAG:
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

  update(dt: number): void {
    if (this.currentAction.isComplete()) {
      switch (this.currentAction.tag) {
        case Fika.TAG:
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


/**
 * 
 * Har bestämt att det alltid är 2 som spelar när det är någon som spelar och man kan se att det kan finnas några som vilar åt gången under träden
 * 
 * Globalt kommer alla träda in i fika om de ska iväg o fika
 * 
 * Annars så pågår bara spelet 
 * 
 */