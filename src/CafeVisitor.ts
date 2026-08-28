import type Group from "./Group";
import Fika from "./cafe/Fika";
import Human from "./Human";
import type { Direction, Vec2 } from "./lib/types";
import Play from "./Play";

export default class CafeVisitor extends Human {
  private play: Play;
  private seatDir: Direction;

  constructor(
    scene: Play,
    pos: Vec2,
    name: string,
    group: Group,
    seatDir: Direction,
  ) {
    super(scene, pos, name, group);
    this.play = scene as Play;
    this.seatDir = seatDir;
  }

  init(): void {
    super.init();
  this.animations.registerSpritesheet("foods");
    if (!this.play.cafe.hasTableReservation(this.group.name)) {
      if (!this.play.cafe.hasAvailableTables())
        throw new Error("No free tables in cafe.");

      this.play.cafe.reserveTable(
        this.group.name,
        this.play.getGroupMembers(this.group.name),
      );
    }

    const table = this.play.cafe.getTable(this.group.name);

    this.transitionToAction(
      Fika.TAG,
      this,
      this.play.cafe,
      table,
      table.getSeat(this.id, this.seatDir),
    );
  }

  update(dt: number): void {
    this.currentAction.update(dt);
  }
}
