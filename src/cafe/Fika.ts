import Human, { getFikaOverlay } from "../Human";
import {
  AnimationSequence,
  GroundArea,
  randomEl,
  Sprite,
  TransitionType,
} from "../lib";
import Timer, {  ONE_MINUTE, THREE_SECONDS } from "../Timer";
import {
  GoTo,
  type CommonActionSpec,
  type CommonUpdatable,
} from "../commonActions";
import type Cafe from "./Cafe";
import { createAction, type Updatable } from "../actions";
import { OrderEventType, type OrderEvent } from "./orders";
import { isSamePos } from "../lib";

import { getGoalPositionWithDirectionAwareRounding } from "../utils";

import type { Seat } from "./Table";
import { fikaItems } from "./Cafe";

const DOOR_VISIBILITY_TRAVEL_RATIO = 0.5;

function getDoorVisibilityTravel(tileSize: number) {
  return Math.round(tileSize * DOOR_VISIBILITY_TRAVEL_RATIO);
}

export class WorkAtCafe implements CafeUpdatable {
  static TAG: "work-at-cafe" = "work-at-cafe";
  readonly tag: "work-at-cafe" = WorkAtCafe.TAG;

  private human: Human;
  private cafe: Cafe;
  private currAction: CafeUpdatable | null;

  constructor(human: Human, cafe: Cafe) {
    this.human = human;
    this.cafe = cafe;
    this.currAction = null;
  }

  init() {
    this.transitionToAction(WaitForOrder.TAG, this.human, this.cafe);
  }

  update(dt: number): void {
    if (this.currAction === null) throw new Error(this.tag + " uninitialized");

    this.currAction.update(dt);

    if (!this.currAction.isComplete()) return;

    switch (this.currAction.tag) {
      case WaitForOrder.TAG: {
        const order = (this.currAction as WaitForOrder).getOrder();
        this.transitionToAction(WaitTable.TAG, this.human, this.cafe, order);
        break;
      }
      case WaitTable.TAG:
        this.transitionToAction(WaitForOrder.TAG, this.human, this.cafe);
        break;
    }
  }

  isComplete(): boolean {
    return false;
  }

  private transitionToAction<A extends keyof FikaActionSpec>(
    tag: A,
    ...args: FikaActionSpec[A]["args"]
  ) {
    this.currAction = createAction(tag, ...args);
    this.currAction!.init();
  }
}

class WaitForOrder implements CafeUpdatable {
  static TAG: "wait-for-order" = "wait-for-order";
  readonly tag: "wait-for-order" = WaitForOrder.TAG;

  private human: Human;
  private cafe: Cafe;
  private order: OrderEvent | null;

  constructor(human: Human, restaurant: Cafe) {
    this.human = human;
    this.cafe = restaurant;
    this.order = null;
  }

  init() {
    this.human.isVisible = false;

    const arrivePos = this.cafe.getArrivePos();
    const insideCenter = {
      x: arrivePos.x,
      y: arrivePos.y - this.human.scene.art!.tileSize,
    };
    if (!isSamePos(this.human.pos, insideCenter)) {
      this.human.pos = insideCenter;
    }
  }

  getOrder(): OrderEvent {
    if (this.order === null) throw new Error("No order found!");
    return this.order;
  }

  update(_: number): void {
    this.order = this.cafe.orders.nextTakeOrder();

    if (this.order === null) {
      this.order = this.cafe.orders.nextPendingOrder();
    }
  }

  isComplete(): boolean {
    return this.order !== null;
  }
}

enum WaitTableStep {
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

class WaitTable implements CafeUpdatable {
  static TAG: "wait-table" = "wait-table";
  readonly tag: "wait-table" = WaitTable.TAG;

  private human: Human;
  private cafe: Cafe;
  private order: OrderEvent;
  private step: WaitTableStep;
  private animationSeq: AnimationSequence | null;
  private goTo: GoTo | null;
  private hasWaited: boolean;
  private fikaItem: string;
  private timer: Timer;

  constructor(human: Human, cafe: Cafe, order: OrderEvent) {
    this.human = human;
    this.cafe = cafe;
    this.order = order;
    this.step = WaitTableStep.ENSURE_INSIDE_CENTER;
    this.animationSeq = null;
    this.goTo = null;
    this.hasWaited = false;
    this.fikaItem = randomEl(fikaItems)!;
    this.timer = new Timer();
  }

  init() {
    const arrivePos = this.cafe.getArrivePos();

    this.human.pos = {
      x: arrivePos.x,
      y: arrivePos.y - this.human.scene.art!.tileSize,
    };

    this.step = WaitTableStep.ENSURE_INSIDE_CENTER;
    this.human.isVisible = false;
  }

  update(dt: number): void {
    switch (this.step) {
      case WaitTableStep.ENSURE_INSIDE_CENTER: {
        const arrivePos = this.cafe.getArrivePos();
        const insideCenter = {
          x: arrivePos.x,
          y: arrivePos.y - this.human.scene.art!.tileSize,
        };
        if (!isSamePos(this.human.pos, insideCenter)) {
          this.human.pos = insideCenter;
        }
        this.step = WaitTableStep.OPEN_DOOR_TO_EXIT;
        break;
      }

      case WaitTableStep.OPEN_DOOR_TO_EXIT:
        if (this.cafe.isDoorClosed()) {
          this.cafe.openDoor();
        } else if (this.cafe.isDoorOpen()) {
          this.step = WaitTableStep.WALK_OUTSIDE;
        }
        break;

      case WaitTableStep.WALK_OUTSIDE:
        if (this.animationSeq === null) {
          const arrivePos = this.cafe.getArrivePos();
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
              options: {
                reverse: true,
                overlays:
                  this.order.type === OrderEventType.SERVE
                    ? [getFikaOverlay(this.human.direction, this.fikaItem, true)]
                    : undefined,
              },
            },
            {
              anim:
                this.order.type === OrderEventType.SERVE
                  ? "walk-hold-s"
                  : "walk-s",
              transition: { dx: 0, dy: doorTravel },
              type: TransitionType.Distance,
              options: {
                overlays:
                  this.order.type === OrderEventType.SERVE
                    ? [getFikaOverlay(this.human.direction, this.fikaItem)]
                    : undefined,
              },
            },
          ]);

          this.animationSeq.start();
          this.human.isVisible = true;
        } else if (this.animationSeq.isFinished) {
          this.human.pos = this.cafe.getArrivePos();
          this.animationSeq.finish();
          this.animationSeq = null;
          this.human.animations.play(
            this.order.type === OrderEventType.SERVE
              ? "idle-stand-hold-s"
              : "idle-stand-s",
            {
              overlays:
                this.order.type === OrderEventType.SERVE
                  ? [getFikaOverlay(this.human.direction, this.fikaItem)]
                  : undefined,
            },
          );
          this.step = WaitTableStep.CLOSE_DOOR_AFTER_EXIT;
        } else {
          this.animationSeq.update(dt);
        }
        break;

      case WaitTableStep.CLOSE_DOOR_AFTER_EXIT:
        if (this.cafe.isDoorOpen()) {
          this.cafe.closeDoor();
        } else if (this.cafe.isDoorClosed()) {
          const tileSize = this.human.scene.art!.tileSize;
          const snappedPos = {
            x: Math.round(this.human.pos.x / tileSize) * tileSize,
            y: Math.round(this.human.pos.y / tileSize) * tileSize,
          };
          if (!isSamePos(snappedPos, this.human.pos)) {
            this.step = WaitTableStep.SNAP_TO_WHOLE_TILE_FOR_TABLE;
          } else {
            this.step = WaitTableStep.WALK_TO_TABLE;
          }
        }
        break;

      case WaitTableStep.SNAP_TO_WHOLE_TILE_FOR_TABLE:
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
              anim:
                this.order.type === OrderEventType.SERVE
                  ? `walk-hold-${this.human.direction}`
                  : `walk-${this.human.direction}`,
              transition: { dx: xDiff, dy: 0 },
              type: TransitionType.Distance,
              options: {
                overlays:
                  this.order.type === OrderEventType.SERVE
                    ? [getFikaOverlay(this.human.direction, this.fikaItem)]
                    : undefined,
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
          this.animationSeq.finish();
          this.animationSeq = null;
          this.step = WaitTableStep.WALK_TO_TABLE;
        } else {
          this.animationSeq.update(dt);
        }
        break;

      case WaitTableStep.WALK_TO_TABLE:
        if (this.goTo === null) {
          const table = this.order.table;

          const goalPos = table.getClosestCornerPos(this.human.pos);
          this.goTo = new GoTo(
            this.human,
            goalPos,
            [GroundArea.GRAVEL, GroundArea.BRICKS],
            [],
            0,
            {
              walk:
                this.order.type === OrderEventType.SERVE ? "walk-hold" : "walk",
              idle:
                this.order.type === OrderEventType.SERVE
                  ? "idle-stand-hold"
                  : "idle-stand",
              overlayFn:
                this.order.type === OrderEventType.SERVE
                  ? (human: Sprite) =>
                      getFikaOverlay(human.direction, this.fikaItem)
                  : undefined,
            },
          );
          this.goTo.init();
        } else if (this.goTo.isComplete()) {
          this.goTo = null;

          this.step = WaitTableStep.SERVE_AT_TABLE;
        } else {
          this.goTo.update(dt);
        }
        break;

      case WaitTableStep.SERVE_AT_TABLE:
        if (!this.hasWaited) {
          switch (this.order.type) {
            case OrderEventType.TAKE:
              this.cafe.placeOrder(this.order.guests);
              break;
            case OrderEventType.SERVE:
              this.cafe.serveOrder(this.order.guests);
              break;
          }

          this.hasWaited = true;

          const direction =
            this.human.pos.x < this.order.table.pos.x ? "e" : "w";
          this.human.direction = direction;

          this.human.animations.play("idle-stand-" + this.human.direction);

          this.timer.start(THREE_SECONDS, () => {
            this.step = WaitTableStep.WALK_TO_ROUNDED_ARRIVE;
          });
        }

        if (this.timer.isStarted && this.timer.isRunning) {
          this.timer.update(dt);
        }
        break;

      case WaitTableStep.WALK_TO_ROUNDED_ARRIVE:
        if (this.goTo === null) {
          this.goTo = new GoTo(
            this.human,
            getGoalPositionWithDirectionAwareRounding(
              this.human.pos,
              this.cafe.getArrivePos(),
              this.human.scene.art!.tileSize,
            ),
            [GroundArea.BRICKS, GroundArea.GRAVEL],
          );
          this.goTo.init();
        } else if (this.goTo.isComplete()) {
          this.goTo = null;
          const arrivePos = this.cafe.getArrivePos();
          if (
            this.human.pos.x !== arrivePos.x ||
            this.human.pos.y !== arrivePos.y
          ) {
            this.step = WaitTableStep.WALK_TO_EXACT_ARRIVE;
          } else {
            this.step = WaitTableStep.OPEN_DOOR_TO_ENTER;
          }
        } else {
          this.goTo.update(dt);
        }
        break;

      case WaitTableStep.WALK_TO_EXACT_ARRIVE:
        if (this.animationSeq === null) {
          const arrivePos = this.cafe.getArrivePos();
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
          const arrivePos = this.cafe.getArrivePos();
          this.human.pos = { x: arrivePos.x, y: arrivePos.y };
          this.animationSeq.finish();
          this.animationSeq = null;
          this.step = WaitTableStep.OPEN_DOOR_TO_ENTER;
        } else {
          this.animationSeq.update(dt);
        }
        break;

      case WaitTableStep.OPEN_DOOR_TO_ENTER:
        this.human.direction = "n";
        this.human.animations.play("idle-stand-n");
        if (this.cafe.isDoorClosed()) {
          this.cafe.openDoor();
        } else if (this.cafe.isDoorOpen()) {
          this.step = WaitTableStep.WALK_INSIDE;
        }
        break;

      case WaitTableStep.WALK_INSIDE:
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
          const arrivePos = this.cafe.getArrivePos();
          const doorTravel = getDoorVisibilityTravel(
            this.human.scene.art!.tileSize,
          );
          this.human.pos = {
            x: arrivePos.x,
            y: arrivePos.y - doorTravel,
          };

          this.human.isVisible = false;
          this.animationSeq.finish();
          this.animationSeq = null;
          this.step = WaitTableStep.CLOSE_DOOR_AFTER_ENTER;
        } else {
          this.animationSeq.update(dt);
        }
        break;

      case WaitTableStep.CLOSE_DOOR_AFTER_ENTER:
        if (this.cafe.isDoorOpen()) {
          this.cafe.closeDoor();
        } else if (this.cafe.isDoorClosed()) {
          this.step = WaitTableStep.DONE;
        }
        break;

      case WaitTableStep.DONE:
        break;
    }
  }

  isComplete(): boolean {
    return this.step === WaitTableStep.DONE;
  }
}

class Order implements CafeUpdatable {
  static TAG: "order" = "order";
  readonly tag: "order" = Order.TAG;
  private cafe: Cafe;
  private human: Human;

  constructor(human: Human, cafe: Cafe) {
    this.human = human;
    this.cafe = cafe;
  }

  init() {}

  update(_: number): void {}

  isComplete(): boolean {
    return this.cafe.hasBeenServed(this.human.group.name);
  }
}

class WaitingToOrder implements CafeUpdatable {
  static TAG: "waiting-to-order" = "waiting-to-order";
  readonly tag: "waiting-to-order" = WaitingToOrder.TAG;
  private human: Human;
  private cafe: Cafe;

  constructor(human: Human, cafe: Cafe) {
    this.human = human;
    this.cafe = cafe;
  }

  init() {
    this.human.animations.play(`idle-sit-${this.human.direction}`);
  }

  update(_: number): void {}

  isComplete(): boolean {
    return (
      this.cafe.allHasEaten(this.human.group.name) ||
      this.cafe.isTakingOrder(this.human.group.name)
    );
  }
}

class Eat implements CafeUpdatable {
  static TAG: "eat" = "eat";
  readonly tag: "eat" = Eat.TAG;
  private timer: Timer;
  private human: Human;

  private duration: number;

  constructor(human: Human, duration: number) {
    this.timer = new Timer();
    this.duration = duration;
    this.human = human;
  }

  init() {
    this.timer.start(this.duration);
    this.human.animations.play(`eat-${this.human.direction}`, {
      overlays: [getFikaOverlay(this.human.direction, randomEl(fikaItems)!)],
    });
  }

  update(dt: number): void {
    this.timer.update(dt);
  }

  isComplete(): boolean {
    return !this.timer.isRunning;
  }
}

export default class Fika implements CafeUpdatable {
  static TAG: "fika" = "fika";
  readonly tag: "fika" = Fika.TAG;

  private human: Human;
  private cafe: Cafe;
  private seat: Seat;
  private currAction: CafeUpdatable | CommonUpdatable | null;

  constructor(human: Human, cafe: Cafe, seat: Seat) {
    this.human = human;
    this.currAction = null;
    this.cafe = cafe;
    this.seat = seat;
  }

  init() {
    this.human.pos.x = this.seat.pos.x;
    this.human.pos.y = this.seat.pos.y;
    this.cafe.arrive(this.human.group.name, this.human.id);
    this.transitionToAction(Order.TAG, this.human, this.cafe);
    this.human.direction = this.seat.getSeatedDirection();
    this.human.animations.play(`idle-sit-${this.human.direction}`);
  }

  update(dt: number): void {
    if (this.currAction === null) throw new Error(this.tag + " uninitialized");

    this.currAction.update(dt);

    if (this.currAction.isComplete()) {
      switch (this.currAction.tag) {
        case Order.TAG:
          this.transitionToAction(Eat.TAG, this.human, ONE_MINUTE);
          break;
        case Eat.TAG:
          this.cafe.hasEaten(this.human.group.name, this.human.id);
          this.transitionToAction(WaitingToOrder.TAG, this.human, this.cafe);
          break;
        case WaitingToOrder.TAG:
          if (!this.cafe.isTakingOrder(this.human.group.name)) {
            this.cafe.takeOrder(this.human.group.name);
          }
          this.transitionToAction(Order.TAG, this.human, this.cafe);
          break;
      }
    }
  }

  isComplete(): boolean {
    if (this.currAction === null) throw new Error(this.tag + " uninitialized");
    return this.currAction.tag === Eat.TAG && this.currAction.isComplete();
  }

  private transitionToAction<
    A extends keyof (FikaActionSpec & CommonActionSpec),
  >(tag: A, ...args: (FikaActionSpec & CommonActionSpec)[A]["args"]) {
    this.currAction = createAction(tag, ...args);
    this.currAction!.init();
  }
}

export interface CafeUpdatable extends Updatable {
  readonly tag: FikaActionTag;
}

const spec = {
  fika: { ctor: Fika },
  "work-at-cafe": { ctor: WorkAtCafe },
  order: { ctor: Order },
  "wait-table": { ctor: WaitTable },
  "wait-for-order": { ctor: WaitForOrder },
  eat: { ctor: Eat },
  "waiting-to-order": { ctor: WaitingToOrder },
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
