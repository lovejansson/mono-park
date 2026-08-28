import type Group from "./Group";
import  { WorkAtCafe } from "./cafe/Fika";
import Human from "./Human";
import type {  Vec2 } from "./lib/types";
import Play from "./Play";


export default class Waiter extends Human {
  private play: Play;


  constructor(scene: Play, pos: Vec2, name: string, group: Group) {
    super(scene, pos, name, group);
    this.play = scene as Play;
  }

  init(): void {
    super.init();

  this.animations.registerSpritesheet("foods");
    this.transitionToAction(
      WorkAtCafe.TAG,
      this,
      this.play.cafe,
    );
  }

  update(dt: number): void {
    this.currentAction.update(dt);
  }
}
