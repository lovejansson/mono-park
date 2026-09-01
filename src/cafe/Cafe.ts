import { type Vec2 } from "../lib";
import House, { Door } from "./House";
import type Play from "../Play";
import OrdersManager from "./orders";
import Table from "./Table";
import Timer, {  THIRTY_SECONDS } from "../Timer";

enum GuestsOrderState {
  ARRIVING,
  TAKE_ORDER,
  PENDING_ORDER,
  SERVED,
}

export const fikaItems = [
  "ice-cream1",
  "ice-cream2",
  "bun",
  "donout",
  "bubble-tea",
  "cookie",
  "coffe",
];

class Guests {
  private guests: { guest: number; hasArrived: boolean; hasEaten: boolean }[];
  private state: GuestsOrderState;

  constructor(guests: number[]) {
    this.guests = guests.map((g) => ({
      guest: g,
      hasArrived: false,
      hasEaten: false,
    }));
    this.state = GuestsOrderState.ARRIVING;
  }

  getState(): GuestsOrderState {
    return this.state;
  }

  updateState(newState: GuestsOrderState): void {
    switch (newState) {
      case GuestsOrderState.ARRIVING:
        throw new Error(
          "Arriving is the initial state. It is set at creation.",
        );
        break;
      case GuestsOrderState.TAKE_ORDER:
        if (
          !(
            this.state === GuestsOrderState.ARRIVING ||
            this.state === GuestsOrderState.SERVED
          )
        )
          // Added served since they order again sometimes
          throw new Error(
            `Invalid state transition for Guests: ${this.state} -> ${newState}`,
          );

        if (!this.allHasArrived())
          throw new Error("Can't take order until all has arrived.");

        if (this.state === GuestsOrderState.SERVED) {
          for (const g of this.guests) {
            g.hasEaten = false;
          }
        }

        this.state = GuestsOrderState.TAKE_ORDER;
        break;
      case GuestsOrderState.PENDING_ORDER:
        if (this.state !== GuestsOrderState.TAKE_ORDER)
          throw new Error(
            `Invalid state transition for Guests: ${this.state} -> ${newState}`,
          );
        this.state = GuestsOrderState.PENDING_ORDER;
        break;
      case GuestsOrderState.SERVED:
        if (this.state !== GuestsOrderState.PENDING_ORDER)
          throw new Error(
            `Invalid state transition for Guests: ${this.state} -> ${newState}`,
          );
        this.state = GuestsOrderState.SERVED;
        break;
    }
  }

  allHasEaten(): boolean {
    return this.guests.every((g) => g.hasEaten);
  }

  allHasArrived(): boolean {
    return this.guests.every((g) => g.hasArrived);
  }

  setGuestHasEaten(guest: number): void {
    const g = this.guests.find((g) => g.guest === guest);

    if (g === undefined) throw new Error("Guest not found!");

    g.hasEaten = true;
  }

  setGuestArrived(guest: number): void {
    const g = this.guests.find((g) => g.guest === guest);

    if (g === undefined) throw new Error("Guest not found!");

    g.hasArrived = true;
  }
}

export default class Cafe extends House {
  private play: Play;
  orders: OrdersManager;
  private tables: Table[];
  private reservedTables: Map<number, string | null>;
  private guests: Map<string, Guests>;
  private timers: Timer[];

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    door: Door,
    tables: Table[],
  ) {
    super(scene, pos, width, height, image, door);
    this.play = scene;
    this.orders = new OrdersManager();
    this.tables = tables;
    this.reservedTables = new Map();

    this.guests = new Map();
    this.timers = [];
  }

  init() {
    for (const t of this.tables) {
      this.reservedTables.set(t.id, null);
    }
  }

  update(dt: number): void {
    let t: Timer = this.timers[0];
    let indicesToRemove: number[] = [];

    for (let i = 0; i < this.timers.length; ++i) {
      t = this.timers[i];
      if (t.isStarted) {
        if (t.isRunning) {
          t.update(dt);
        } else {
          t.stop();
          indicesToRemove.push(i);
        }
      }
    }

    for (const i of indicesToRemove) {
      this.timers.splice(i, 1);
    }
  }

  placeOrder(guests: string) {
    const table = this.getTable(guests);

    const timer = new Timer();

    timer.start(THIRTY_SECONDS, () => {
      this.orders.order(table, guests);
    });

    this.timers.push(timer);

    const guestsState = this.getGuestsState(guests);
    guestsState.updateState(GuestsOrderState.PENDING_ORDER);
  }

  hasBeenServed(guests: string): boolean {
    const guestsState = this.getGuestsState(guests);
    return guestsState.getState() === GuestsOrderState.SERVED;
  }

  allHasEaten(guests: string): boolean {
    const guestsState = this.getGuestsState(guests);
    return guestsState.allHasEaten();
  }

  hasEaten(guests: string, guest: number): void {
    const guestsState = this.getGuestsState(guests);
    guestsState.setGuestHasEaten(guest);
  }

  takeOrder(guests: string): void {
    const guestsState = this.getGuestsState(guests);
    guestsState.updateState(GuestsOrderState.TAKE_ORDER);
    const table = this.getTable(guests);

    const timer = new Timer();

    timer.start(THIRTY_SECONDS, () => {
      this.orders.takeOrder(table, guests);
    });

    this.timers.push(timer);
  }

  isTakingOrder(guests: string): boolean {
    const guestsState = this.getGuestsState(guests);
    return guestsState.getState() === GuestsOrderState.TAKE_ORDER;
  }
  arrive(guests: string, guest: number): void {
    const guestsState = this.getGuestsState(guests);

    guestsState.setGuestArrived(guest);

    if (guestsState.allHasArrived()) {
      guestsState.updateState(GuestsOrderState.TAKE_ORDER);
      const table = this.getTable(guests);

      const timer = new Timer();

      timer.start(THIRTY_SECONDS, () => {
        this.orders.takeOrder(table, guests);
      });

      this.timers.push(timer);
    }
  }

  serveOrder(guests: string): void {
    const guestsState = this.getGuestsState(guests);
    guestsState.updateState(GuestsOrderState.SERVED);
  }

  private getGuestsState(guests: string): Guests {
    const guestsState = this.guests.get(guests);

    if (guestsState === undefined) throw new Error("Guests not at cafe!");

    return guestsState;
  }

  getTables() {
    return this.tables;
  }

  hasAvailableTables(): boolean {
    return (
      this.tables.find((t) => this.reservedTables.get(t.id) === null) !==
      undefined
    );
  }

  reserveTable(guests: string, individualGuests: number[]): Table {
    const table = this.tables.find(
      (t) => this.reservedTables.get(t.id) === null,
    );

    if (table === undefined) throw new Error("Café has no available tables.");

    this.reservedTables.set(table.id, guests);

    this.guests.set(guests, new Guests(individualGuests));

    return table;
  }

  hasTableReservation(guests: string): boolean {
    for (const [t, g] of this.reservedTables) {
      if (g === guests) return true;
    }

    return false;
  }

  leaveTable(tableID: number, guests: string): void {
    const isValidTable =
      this.tables.find((t) => t.id === tableID) !== undefined;
    if (!isValidTable) throw new Error("Table is not found!");

    const reservation = this.reservedTables.get(tableID);

    if (reservation !== guests)
      throw new Error(
        `Table is not reserved by ${guests}, state: ${reservation}`,
      );

    this.reservedTables.set(tableID, null);
  }

  getTable(guests: string): Table {
    for (const [t, g] of this.reservedTables) {
      if (guests === g) {
        const table = this.tables.find((t2) => t2.id === t);

        if (table === undefined)
          throw new Error("Table reservation not found.");

        return table;
      }
    }
    throw new Error("Table reservation not found");
  }
}
