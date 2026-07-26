import type Human from "../Human";
import {
  AnimationSequence,
  TransitionType,
  type Direction,
  type Vec2,
} from "../lib";
import type Play from "../Play";
import Timer, {
  ONE_MINUTE,
  TEN_MINUTES,
  TEN_SECONDS,
  THIRTY_SECONDS,
} from "../Timer";
import { GoTo, type CommonUpdatable } from "../commonActions";
import type Cafe from "./Cafe";
import { createAction, type Updatable } from "../actions";
import type { OrderEvent } from "./orders";
import {
  getGoalPositionWithDirectionAwareRounding,
  getOppositeDirection,
  getPosDiff,
  getStartPositionWithDirectionAwareRounding,
  isSamePos,
  randomEl,
} from "../utils";
import { getFoodOverlay } from "../Human";
import type Table from "./Table";

const DOOR_VISIBILITY_TRAVEL_RATIO = 0.5;

function getDoorVisibilityTravel(tileSize: number) {
  return Math.round(tileSize * DOOR_VISIBILITY_TRAVEL_RATIO);
}

class SitDown implements CafeUpdatable {
  static TAG: "sit-down" = "sit-down";
  readonly tag: "sit-down" = SitDown.TAG;
  private human: Human;
  private seat: { pos: Vec2; direction: Direction };
  private animSeq: AnimationSequence;

  constructor(human: Human, seat: { pos: Vec2; direction: Direction }) {
    this.human = human;
    this.seat = seat;
    const seatDelta = getPosDiff(this.seat.pos, this.human.pos);

    if (seatDelta.y > 0) {
      this.human.direction = "s";
    } else if (seatDelta.y < 0) {
      this.human.direction = "n";
    } else if (seatDelta.x > 0) {
      this.human.direction = "e";
    } else if (seatDelta.x < 0) {
      this.human.direction = "w";
    }

    this.animSeq = new AnimationSequence(this.human, [
      AnimationSequence.createAnim({
        anim: `walk-${this.human.direction}`,
        type: TransitionType.Distance,
        transition: { dx: seatDelta.x, dy: seatDelta.y },
      }),
    ]);

    this.animSeq.start();
  }

  init() {}

  update(dt: number): void {
    if (this.animSeq.isFinished && !this.human.isSitting()) {
      const tileSize = this.human.scene.art!.tileSize;
      const seatDiff = tileSize / 4;

      this.human.pos.y -= seatDiff;

      this.human.direction = getOppositeDirection(this.seat.direction);
      this.human.animations.play(`idle-sit-${this.human.direction}`);
    } else {
      this.animSeq.update(dt);
    }
  }

  isComplete(): boolean {
    return this.human.isSitting();
  }
}

enum PlaceOrderStep {
  WALK_TO_CENTER,
  OPEN_DOOR_TO_ENTER,
  WALK_INSIDE,
  CLOSE_DOOR_AFTER_ENTER,
  WAIT_FOR_ORDERING,
  OPEN_DOOR_TO_EXIT,
  WALK_OUTSIDE,
  WALK_FROM_CENTER,
  CLOSE_DOOR_AFTER_EXIT,
  DONE,
}

class PlaceOrder implements CafeUpdatable {
  static TAG: "order" = "order";
  readonly tag: "order" = PlaceOrder.TAG;
  private human: Human;
  private animationSeq: AnimationSequence | null;
  private placingOrderTimer: Timer | null;
  private restaurant: Cafe;

  private step: PlaceOrderStep;
  private table: Table;
  private hasDoorCenterDiff: boolean;

  constructor(human: Human, restaurant: Cafe, table: Table) {
    this.human = human;
    this.restaurant = restaurant;
    this.table = table;

    // Play animations to walk inside of restaurant assuming standing outside of it
    this.animationSeq = null;
    this.placingOrderTimer = null;

    this.hasDoorCenterDiff = !isSamePos(
      restaurant.getArrivePos(),
      this.human.pos,
    );

    this.step = this.hasDoorCenterDiff
      ? PlaceOrderStep.WALK_TO_CENTER
      : PlaceOrderStep.OPEN_DOOR_TO_ENTER;
  }

  init() {}

  update(dt: number): void {
    switch (this.step) {
      case PlaceOrderStep.WALK_TO_CENTER:
        if (this.animationSeq === null) {
          this.animationSeq = new AnimationSequence(this.human, [
            {
              anim: `walk-${this.human.direction}`,
              transition: {
                dx: this.restaurant.getArrivePos().x - this.human.pos.x,
                dy: 0,
              },
              type: TransitionType.Distance,
            },
          ]);

          this.animationSeq.start();
        } else if (this.animationSeq.isFinished) {
          this.animationSeq = null;
          this.step = PlaceOrderStep.OPEN_DOOR_TO_ENTER;
        } else {
          this.animationSeq.update(dt);
        }
        break;
      case PlaceOrderStep.OPEN_DOOR_TO_ENTER:
        this.human.direction = "n";
        this.human.animations.play("idle-stand-n");
        if (this.restaurant.isDoorClosed()) {
          this.restaurant.openDoor();
        } else if (this.restaurant.isDoorOpen()) {
          this.step = PlaceOrderStep.WALK_INSIDE;
        }

        break;
      case PlaceOrderStep.WALK_INSIDE:
        if (this.animationSeq === null) {
          const doorTravel = getDoorVisibilityTravel(
            this.human.scene.art!.tileSize,
          );
          this.animationSeq = new AnimationSequence(this.human, [
            {
              anim: "walk-n",
              transition: { dx: 0, dy: -doorTravel },
              type: TransitionType.Distance,
            },
            {
              anim: "fade-n",
              transition: null,
              type: TransitionType.Finished,
            },
          ]);

          this.animationSeq.start();
          this.human.direction = "n";
        } else if (this.animationSeq.isFinished) {
          const playing = this.human.animations.getPlaying();
          if (playing !== null) {
            this.human.animations.stop(playing);
          }
          this.human.setVisible(false);
          this.animationSeq = null;
          this.step = PlaceOrderStep.CLOSE_DOOR_AFTER_ENTER;
        } else {
          this.animationSeq.update(dt);
        }

        break;
      case PlaceOrderStep.CLOSE_DOOR_AFTER_ENTER:
        if (this.restaurant.isDoorOpen()) {
          this.restaurant.closeDoor();
        } else if (this.restaurant.isDoorClosed()) {
          this.step = PlaceOrderStep.WAIT_FOR_ORDERING;
        }
        break;
      case PlaceOrderStep.WAIT_FOR_ORDERING:
        if (this.placingOrderTimer === null) {
          this.placingOrderTimer = new Timer();
          this.placingOrderTimer.start(3000);
        } else if (this.placingOrderTimer.isStopped) {
          this.step = PlaceOrderStep.OPEN_DOOR_TO_EXIT;
        }
        break;
      case PlaceOrderStep.OPEN_DOOR_TO_EXIT:
        if (this.restaurant.isDoorClosed()) {
          this.restaurant.openDoor();
        } else if (this.restaurant.isDoorOpen()) {
          this.step = PlaceOrderStep.WALK_OUTSIDE;
        }
        break;
      case PlaceOrderStep.WALK_OUTSIDE:
        if (this.animationSeq === null) {
          const arrivePos = this.restaurant.getArrivePos();
          const doorTravel = getDoorVisibilityTravel(
            this.human.scene.art!.tileSize,
          );
          this.human.pos = {
            x: arrivePos.x,
            y: arrivePos.y - doorTravel,
          };
          this.human.setVisible(true);
          this.animationSeq = new AnimationSequence(this.human, [
            {
              anim: "fade-s",
              transition: null,
              type: TransitionType.Finished,
              options: { reverse: true },
            },
            {
              anim: "walk-s",
              transition: { dx: 0, dy: doorTravel },
              type: TransitionType.Distance,
            },
          ]);
          this.human.direction = "s";
          this.animationSeq.start();
        } else if (this.animationSeq.isFinished) {
          this.human.pos = this.restaurant.getArrivePos();
          this.step = PlaceOrderStep.CLOSE_DOOR_AFTER_EXIT;
          this.human.animations.play(`idle-stand-s`);

          this.animationSeq = null;
        } else {
          this.animationSeq.update(dt);
        }
        break;
      case PlaceOrderStep.CLOSE_DOOR_AFTER_EXIT:
        if (this.restaurant.isDoorOpen()) {
          this.restaurant.closeDoor();
        } else if (this.restaurant.isDoorClosed()) {
          if (this.hasDoorCenterDiff) {
            this.step = PlaceOrderStep.WALK_FROM_CENTER;
          } else {
            setTimeout(() => {
              this.restaurant.placeOrder(this.table);
            }, TEN_SECONDS);
            this.step = PlaceOrderStep.DONE;
          }
        }
        break;
      case PlaceOrderStep.WALK_FROM_CENTER:
        if (this.animationSeq === null) {
          const endPos = getStartPositionWithDirectionAwareRounding(
            this.human.pos,
            this.table.pos,
            this.human.scene.art!.tileSize,
          );
          console.log(endPos);
          const xDiff = endPos.x - this.human.pos.x;

          if (xDiff > 0) {
            this.human.direction = "e";
          } else {
            this.human.direction = "w";
          }
          this.animationSeq = new AnimationSequence(this.human, [
            {
              anim: `walk-${this.human.direction}`,
              transition: {
                dx: xDiff,
                dy: 0,
              },
              type: TransitionType.Distance,
            },
          ]);

          this.animationSeq.start();
        } else if (this.animationSeq.isFinished) {
          this.animationSeq = null;
          setTimeout(() => {
            this.restaurant.placeOrder(this.table);
          }, ONE_MINUTE);
          this.step = PlaceOrderStep.DONE;
        } else {
          this.animationSeq.update(dt);
        }
        break;
      case PlaceOrderStep.DONE:
        break;
    }
  }

  isComplete(): boolean {
    return this.step === PlaceOrderStep.DONE;
  }
}

export class WorkAtCafe implements CafeUpdatable {
  static TAG: "work-restaurant" = "work-restaurant";
  readonly tag: "work-restaurant" = WorkAtCafe.TAG;

  private human: Human;
  private restaurant: Cafe;
  private currAction: CafeUpdatable | null;

  constructor(human: Human) {
    this.human = human;
    this.restaurant = (human.scene as Play).restaurants[0];
    this.currAction = null;
  }

  init() {
    this.transitionToAction(
      new WaitForOrder(this.human, this.restaurant),
      "Waiter waiting for orders",
    );
  }

  update(dt: number): void {
    if (this.currAction === null) throw new Error(this.tag + " uninitialized");

    this.currAction.update(dt);

    if (!this.currAction.isComplete()) return;

    switch (this.currAction.tag) {
      case WaitForOrder.TAG: {
        const order = (this.currAction as WaitForOrder).getFoundOrder();
        this.transitionToAction(
          new GiveOrder(this.human, this.restaurant, order),
          "Waiter delivering order to table",
          order.tableId,
        );
        break;
      }
      case GiveOrder.TAG:
        this.transitionToAction(
          new WaitForOrder(this.human, this.restaurant),
          "Waiter waiting for next order",
        );
        break;
    }
  }

  isComplete(): boolean {
    return false;
  }

  private transitionToAction(
    nextAction: CafeUpdatable,
    reason?: string,
    targetID?: number,
  ) {
    if (this.currAction !== null) {
      this.human.utility.popAction();
    }

    this.currAction = nextAction;

    this.human.utility.pushAction({
      currentAction: this.currAction.tag,
      parentAction: this.tag,
      reason: reason ?? null,
      targetId: targetID ?? null,
    });

    this.currAction.init();
  }
}

class WaitForOrder implements CafeUpdatable {
  static TAG: "wait-for-order" = "wait-for-order";
  readonly tag: "wait-for-order" = WaitForOrder.TAG;

  private human: Human;
  private restaurant: Cafe;
  private foundOrder: OrderEvent | null;

  constructor(human: Human, restaurant: Cafe) {
    this.human = human;

    this.restaurant = restaurant;
    this.foundOrder = null;
  }

  init() {
    this.human.setVisible(false);
  }

  getFoundOrder(): OrderEvent {
    if (this.foundOrder === null) throw new Error("No order found yet");
    return this.foundOrder;
  }

  update(_: number): void {
    if (this.foundOrder !== null) return;
    const order = this.restaurant.getOrder();
    if (order !== null) {
      this.human.setVisible(true);

      this.foundOrder = order;
    }
  }

  isComplete(): boolean {
    return this.foundOrder !== null;
  }
}

enum GiveOrderStep {
  ENSURE_INSIDE_CENTER,
  OPEN_DOOR_TO_EXIT,
  WALK_OUTSIDE,
  SNAP_TO_WHOLE_TILE_FOR_TABLE,
  CLOSE_DOOR_AFTER_EXIT,
  WALK_TO_TABLE,
  SERVE_AT_TABLE,
  WALK_TO_ROUNDED_ARRIVE,
  WALK_TO_EXACT_ARRIVE,
  OPEN_DOOR_TO_ENTER,
  WALK_INSIDE,
  CLOSE_DOOR_AFTER_ENTER,
  DONE,
}

class GiveOrder implements CafeUpdatable {
  static TAG: "give-order" = "give-order";
  readonly tag: "give-order" = GiveOrder.TAG;

  private human: Human;
  private restaurant: Cafe;
  private order: OrderEvent;
  private step: GiveOrderStep;
  private animationSeq: AnimationSequence | null;
  private goTo: GoTo | null;
  private hasServed: boolean;

  constructor(human: Human, restaurant: Cafe, order: OrderEvent) {
    this.human = human;
    this.restaurant = restaurant;
    this.order = order;
    this.step = GiveOrderStep.ENSURE_INSIDE_CENTER;
    this.animationSeq = null;
    this.goTo = null;
    this.hasServed = false;
  }

  init() {
    const arrivePos = this.restaurant.getArrivePos();

    this.human.pos = {
      x: arrivePos.x,
      y: arrivePos.y - this.human.scene.art!.tileSize,
    };

    this.step = GiveOrderStep.ENSURE_INSIDE_CENTER;
  }

  update(dt: number): void {
    switch (this.step) {
      case GiveOrderStep.ENSURE_INSIDE_CENTER: {
        const arrivePos = this.restaurant.getArrivePos();
        const insideCenter = {
          x: arrivePos.x,
          y: arrivePos.y - this.human.scene.art!.tileSize,
        };
        if (!isSamePos(this.human.pos, insideCenter)) {
          this.human.pos = insideCenter;
        }
        this.step = GiveOrderStep.OPEN_DOOR_TO_EXIT;
        break;
      }

      case GiveOrderStep.OPEN_DOOR_TO_EXIT:
        this.human.direction = "s";
        {
          const playing = this.human.animations.getPlaying();
          if (playing !== null) {
            this.human.animations.stop(playing);
          }
        }
        if (this.restaurant.isDoorClosed()) {
          this.restaurant.openDoor();
        } else if (this.restaurant.isDoorOpen()) {
          this.step = GiveOrderStep.WALK_OUTSIDE;
        }
        break;

      case GiveOrderStep.WALK_OUTSIDE:
        if (this.animationSeq === null) {
          const arrivePos = this.restaurant.getArrivePos();
          const doorTravel = getDoorVisibilityTravel(
            this.human.scene.art!.tileSize,
          );
          this.human.pos = {
            x: arrivePos.x,
            y: arrivePos.y - doorTravel,
          };
          this.human.direction = "s";
          this.animationSeq = new AnimationSequence(this.human, [
            {
              anim: "fade-s",
              transition: null,
              type: TransitionType.Finished,
              options: { reverse: true },
            },
            {
              anim: "walk-hold-s",
              transition: { dx: 0, dy: doorTravel },
              type: TransitionType.Distance,
              options: {
                overlay: getFoodOverlay(this.human.direction, "pizza"),
              },
            },
          ]);

          this.animationSeq.start();
        } else if (this.animationSeq.isFinished) {
          this.human.direction = "s";
          this.human.pos = this.restaurant.getArrivePos();
          this.animationSeq = null;
          this.human.animations.play("idle-stand-hold-s", {
            overlay: getFoodOverlay(this.human.direction, "pizza"),
          });
          this.step = GiveOrderStep.CLOSE_DOOR_AFTER_EXIT;
        } else {
          this.animationSeq.update(dt);
        }
        break;

      case GiveOrderStep.CLOSE_DOOR_AFTER_EXIT:
        if (this.restaurant.isDoorOpen()) {
          this.restaurant.closeDoor();
        } else if (this.restaurant.isDoorClosed()) {
          const tileSize = this.human.scene.art!.tileSize;
          const snappedPos = {
            x: Math.round(this.human.pos.x / tileSize) * tileSize,
            y: Math.round(this.human.pos.y / tileSize) * tileSize,
          };
          if (!isSamePos(snappedPos, this.human.pos)) {
            this.step = GiveOrderStep.SNAP_TO_WHOLE_TILE_FOR_TABLE;
          } else {
            this.step = GiveOrderStep.WALK_TO_TABLE;
          }
        }
        break;

      case GiveOrderStep.SNAP_TO_WHOLE_TILE_FOR_TABLE:
        if (this.animationSeq === null) {
          const tileSize = this.human.scene.art!.tileSize;
          const snappedPos = {
            x: Math.round(this.human.pos.x / tileSize) * tileSize,
            y: Math.round(this.human.pos.y / tileSize) * tileSize,
          };
          const xDiff = snappedPos.x - this.human.pos.x;
          this.human.direction = xDiff > 0 ? "e" : "w";
          this.animationSeq = new AnimationSequence(this.human, [
            {
              anim: `walk-hold-${this.human.direction}`,
              transition: { dx: xDiff, dy: 0 },
              type: TransitionType.Distance,
              options: {
                overlay: getFoodOverlay(this.human.direction, "pizza"),
              },
            },
          ]);
          this.animationSeq.start();
        } else if (this.animationSeq.isFinished) {
          const tileSize = this.human.scene.art!.tileSize;
          const snappedPos = {
            x: Math.round(this.human.pos.x / tileSize) * tileSize,
            y: Math.round(this.human.pos.y / tileSize) * tileSize,
          };
          this.human.pos = snappedPos;
          this.animationSeq = null;
          this.step = GiveOrderStep.WALK_TO_TABLE;
        } else {
          this.animationSeq.update(dt);
        }
        break;

      case GiveOrderStep.WALK_TO_TABLE:
        if (this.goTo === null) {
          const table = (this.human.scene as Play).tables.getTable(
            this.order.tableId,
          );
          const goalPos = table.getClosestCornerPos(
            this.human.pos,
            this.human.scene.art!.tileSize,
          );
          this.goTo = new GoTo(this.human, goalPos, {
            walk: "walk-hold",
            idle: "idle-stand-hold",
            overlayFn: (human: Human) =>
              getFoodOverlay(human.direction, "pizza"),
          });
          this.goTo.init();
        } else if (this.goTo.isComplete()) {
          this.goTo = null;

          this.step = GiveOrderStep.SERVE_AT_TABLE;
        } else {
          this.goTo.update(dt);
        }
        break;

      case GiveOrderStep.SERVE_AT_TABLE:
        if (!this.hasServed) {
          this.restaurant.serveOrder(this.order.tableId);
          setTimeout(() => {
            this.step = GiveOrderStep.WALK_TO_ROUNDED_ARRIVE;
          }, 3000);
        }

        break;

      case GiveOrderStep.WALK_TO_ROUNDED_ARRIVE:
        if (this.goTo === null) {
          this.goTo = new GoTo(
            this.human,
            getGoalPositionWithDirectionAwareRounding(
              this.human.pos,
              this.restaurant.getArrivePos(),
              this.human.scene.art!.tileSize,
            ),
          );
          this.goTo.init();
        } else if (this.goTo.isComplete()) {
          this.goTo = null;
          const arrivePos = this.restaurant.getArrivePos();
          if (
            this.human.pos.x !== arrivePos.x ||
            this.human.pos.y !== arrivePos.y
          ) {
            this.step = GiveOrderStep.WALK_TO_EXACT_ARRIVE;
          } else {
            this.step = GiveOrderStep.OPEN_DOOR_TO_ENTER;
          }
        } else {
          this.goTo.update(dt);
        }
        break;

      case GiveOrderStep.WALK_TO_EXACT_ARRIVE:
        if (this.animationSeq === null) {
          const arrivePos = this.restaurant.getArrivePos();
          const xDiff = arrivePos.x - this.human.pos.x;
          this.human.direction = xDiff > 0 ? "e" : "w";
          this.animationSeq = new AnimationSequence(this.human, [
            {
              anim: `walk-${this.human.direction}`,
              transition: { dx: xDiff, dy: 0 },
              type: TransitionType.Distance,
            },
          ]);
          this.animationSeq.start();
        } else if (this.animationSeq.isFinished) {
          const arrivePos = this.restaurant.getArrivePos();
          this.human.pos = { x: arrivePos.x, y: arrivePos.y };
          this.animationSeq = null;
          this.step = GiveOrderStep.OPEN_DOOR_TO_ENTER;
        } else {
          this.animationSeq.update(dt);
        }
        break;

      case GiveOrderStep.OPEN_DOOR_TO_ENTER:
        this.human.direction = "n";
        this.human.animations.play("idle-stand-n");
        if (this.restaurant.isDoorClosed()) {
          this.restaurant.openDoor();
        } else if (this.restaurant.isDoorOpen()) {
          this.step = GiveOrderStep.WALK_INSIDE;
        }
        break;

      case GiveOrderStep.WALK_INSIDE:
        if (this.animationSeq === null) {
          const doorTravel = getDoorVisibilityTravel(
            this.human.scene.art!.tileSize,
          );
          this.animationSeq = new AnimationSequence(this.human, [
            {
              anim: "walk-n",
              transition: { dx: 0, dy: -doorTravel },
              type: TransitionType.Distance,
            },
            {
              anim: "fade-n",
              transition: null,
              type: TransitionType.Finished,
            },
          ]);
          this.human.direction = "n";
          this.animationSeq.start();
        } else if (this.animationSeq.isFinished) {
          const arrivePos = this.restaurant.getArrivePos();
          const doorTravel = getDoorVisibilityTravel(
            this.human.scene.art!.tileSize,
          );
          this.human.pos = {
            x: arrivePos.x,
            y: arrivePos.y - doorTravel,
          };
          const playing = this.human.animations.getPlaying();
          if (playing !== null) {
            this.human.animations.stop(playing);
          }
          this.human.setVisible(false);
          this.animationSeq = null;
          this.step = GiveOrderStep.CLOSE_DOOR_AFTER_ENTER;
        } else {
          this.animationSeq.update(dt);
        }
        break;

      case GiveOrderStep.CLOSE_DOOR_AFTER_ENTER:
        if (this.restaurant.isDoorOpen()) {
          this.restaurant.closeDoor();
        } else if (this.restaurant.isDoorClosed()) {
          this.step = GiveOrderStep.DONE;
        }
        break;

      case GiveOrderStep.DONE:
        break;
    }
  }

  isComplete(): boolean {
    return this.step === GiveOrderStep.DONE;
  }
}

class ReceiveOrder implements CafeUpdatable {
  static TAG: "receive-order" = "receive-order";
  readonly tag: "receive-order" = ReceiveOrder.TAG;
  private hasReceivedOrder: boolean;
  private restaurant: Cafe;
  private tableId: number;

  constructor(_: Human, restaurant: Cafe, tableId: number) {
    this.hasReceivedOrder = false;
    this.restaurant = restaurant;
    this.tableId = tableId;
  }

  init() {
    this.hasReceivedOrder = false;
  }

  update(_: number): void {
    if (this.hasReceivedOrder) return;
    const served = this.restaurant.getServedOrder(this.tableId);
    if (served !== null) {
      this.hasReceivedOrder = true;
    }
  }

  isComplete(): boolean {
    return this.hasReceivedOrder;
  }
}

class Eat implements CafeUpdatable {
  static TAG: "eat" = "eat";
  readonly tag: "eat" = Eat.TAG;
  private timer: Timer;
  private human: Human;

  constructor(human: Human, duration: number) {
    this.timer = new Timer();
    this.timer.start(duration);
    this.human = human;
  }

  init() {}

  update(_: number): void {
    if (!this.human.animations.isPlaying(`eat-${this.human.direction}`)) {
      this.human.animations.play(`eat-${this.human.direction}`, {
        overlay: getFoodOverlay(this.human.direction, "pizza"),
      });
    }
  }

  isComplete(): boolean {
    return this.timer.isStopped;
  }
}

class Leave implements CafeUpdatable {
  static TAG: "leave" = "leave";
  readonly tag: "leave" = Leave.TAG;
  private timer: Timer;
  private human: Human;

  constructor(human: Human) {
    this.timer = new Timer();
    this.human = human;
  }

  init() {}

  update(_: number): void {
    if (!this.human.animations.isPlaying(`idle-sit-${this.human.direction}`)) {
      this.human.animations.play(`idle-sit-${this.human.direction}`);
    }
  }

  isComplete(): boolean {
    return this.timer.isStopped;
  }
}

export default class Fika implements CafeUpdatable {
  static TAG: "fika" = "fika";
  readonly tag: "fika" = Fika.TAG;

  private human: Human;
  private cafe: Cafe;
  private table: Table;
  private seat: { pos: Vec2; direction: Direction };
  private currAction: CafeUpdatable | CommonUpdatable | null;
  private hasPlacedOrder: boolean;

  constructor(human: Human, cafe: Cafe) {
    this.human = human;
    this.currAction = null;
    this.hasPlacedOrder = false;
    this.cafe = cafe;
    this.table = this.cafe.arrive();
    this.seat = this.table.getSeat();
  }

  init() {
    this.transitionToAction(
      createAction(
        GoTo.TAG,
        this.human,
        getGoalPositionWithDirectionAwareRounding(
          this.human.pos,
          this.cafe.getArrivePos(),
          this.human.scene.art!.tileSize,
        ),
      ),
      `Human will go eat at ${this.cafe.image}.`,
      this.cafe.id,
    );
  }

  update(dt: number): void {
    if (this.currAction === null) throw new Error(this.tag + " uninitialized");

    this.currAction.update(dt);

    if (!this.currAction.isComplete()) return;

    switch (this.currAction.tag) {
      case GoTo.TAG:
        if (this.hasPlacedOrder) {
          this.transitionToAction(
            createAction(SitDown.TAG, this.human, this.seat),
            `Human will sit down at table at restaurant ${this.cafe.image}`,
            this.table.id,
          );
        } else {
          this.transitionToAction(
            createAction(
              PlaceOrder.TAG,
              this.human,
              this.cafe,
              this.table,
            ),
            `Human will go inside ${this.cafe.image} and place order`,
            this.cafe.id,
          );
        }

        break;
      case PlaceOrder.TAG:
        const pos = this.table.getArrivePos(
          this.human.pos,
          this.seat,
          this.human.scene.art!.tileSize,
        );

        this.transitionToAction(
          createAction(GoTo.TAG, this.human, pos),
          `Human will walk to table at restaurant ${this.cafe.image}`,
          this.table.id,
        );

        this.hasPlacedOrder = true;

        break;

      case SitDown.TAG:
        this.transitionToAction(
          createAction(
            ReceiveOrder.TAG,
            this.human,
            this.cafe,
            this.table.id,
          ),
          `Human will wait for order at restaurant ${this.cafe.image}`,
          this.table.id,
        );
        break;
      case ReceiveOrder.TAG:
        this.transitionToAction(
          createAction(Eat.TAG, this.human, ONE_MINUTE),
          `Human will eat at ${this.cafe.image}`,
          this.table.id,
        );
        break;
      case Eat.TAG:
        this.transitionToAction(
          createAction(Leave.TAG, this.human),
          `Human will leave the restaurant ${this.cafe.image}`,
          this.cafe.id,
        );
        // When eat is complete the whole state is complete, no further action
        break;
    }
  }

  isComplete(): boolean {
    if (this.currAction === null) throw new Error(this.tag + " uninitialized");
    return this.currAction.tag === Eat.TAG && this.currAction.isComplete();
  }

  private transitionToAction(
    nextAction: CommonUpdatable | CafeUpdatable,
    reason?: string,
    targetID?: number,
  ) {
    if (this.currAction !== null) {
      this.human.utility.popAction();
    }

    this.currAction = nextAction;

    this.human.utility.pushAction({
      currentAction: this.currAction.tag,
      parentAction: this.tag,
      reason: reason ?? null,
      targetId: targetID ?? null,
    });

    this.currAction.init();
  }
}

interface CafeUpdatable extends Updatable {
  readonly tag: FikaActionTag;
}

const spec = {
  "fika": { ctor: Fika },
  "work-at-cafe": { ctor: WorkAtCafe },
  "sit-down": { ctor: SitDown },
  order: { ctor: PlaceOrder },
  "receive-order": { ctor: ReceiveOrder },
  "give-order": { ctor: GiveOrder },
  "wait-for-order": { ctor: WaitForOrder },
  eat: { ctor: Eat },
  leave: { ctor: Leave },
} as const;

export type FikaActionSpec = {
  [K in keyof typeof spec]: {
    args: ConstructorParameters<(typeof spec)[K]["ctor"]>;
    result: InstanceType<(typeof spec)[K]["ctor"]>;
  };
};

export type FikaActionTag = keyof FikaActionSpec;

export const ActionConstructors = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [k, v.ctor]),
) as { [K in FikaActionTag]: (typeof spec)[K]["ctor"] };
