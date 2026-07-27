import {  type Vec2 } from "../lib";
import House, { Door } from "./House";
import type Play from "../Play";
import OrdersManager from "./orders";
import Table from "./Table";

export default class Cafe extends House {
  private play: Play;
  private orders: OrdersManager;

  constructor(
    scene: Play,
    pos: Vec2,
    width: number,
    height: number,
    image: string,
    door: Door,
  ) {
    super(scene, pos, width, height, image, door);
    this.play = scene;
    this.orders = new OrdersManager();
  }

  placeOrder(table: Table) {
    this.orders.add({ pos: table.pos, tableId: table.id });
  }

  getOrder() {
    return this.orders.next();
  }

  serveOrder(tableId: number) {
    this.orders.serve(tableId);
  }

  getServedOrder(tableId: number) {
    return this.orders.nextServed(tableId);
  }

  hasAvailableTables() {
    return this.play.tables.hasAvailableTables(this.image);
  }

  arrive() {
    if (!this.hasAvailableTables())
      throw new Error("Restaurant has no available tables.");
    const table = this.play.tables.reserveTable(this.image);
    return table;
  }

  leave(tableID: number) {
    this.play.tables.leaveTable(tableID);
  }
}

export class Tables {
  private tables: { table: Table; isFree: boolean }[];

  constructor(tables: Table[]) {
    this.tables = tables.map((t) => ({ table: t, isFree: true }));
  }

  getTables() {
    return this.tables.map(t => t.table);
  }

  hasAvailableTables(restaurant: string): boolean {
    return (
      this.tables.find(
        (t) =>
          t.table.restaurants.find((r) => r === restaurant) !== undefined &&
          t.isFree,
      ) !== undefined
    );
  }

  reserveTable(restaurant: string): Table {
    const table = this.tables.find(
      (t) =>
        t.table.restaurants.find((r) => r === restaurant) !== undefined &&
        t.isFree,
    );

    if (table === undefined)
      throw new Error("Restaurant has no available tables.");

    table.isFree = false;

    return table.table;
  }

  leaveTable(tableID: number): void {
    const table = this.tables.find((t) => t.table.id === tableID);

    if (table === undefined) throw new Error("Table not found");

    table.isFree = true;
  }

  getTable(tableID: number): Table {
    const table = this.tables.find((t) => t.table.id === tableID);
    if (table === undefined) throw new Error("Table not found");
    return table.table;
  }
}
