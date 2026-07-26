import type { Vec2 } from "../lib";

export type OrderEvent = {
  tableId: number;
  pos: Vec2;
};

type ServedEvent = {
  tableId: number;
};

export default class OrdersManager {
  private pending: OrderEvent[];
  private served: ServedEvent[];

  constructor() {
    this.pending = [];
    this.served = [];
  }

  add(event: OrderEvent) {
    this.pending.push(event);
  }

  next(): OrderEvent | null {
    return this.pending.shift() ?? null;
  }

  serve(tableId: number) {
    this.served.push({ tableId });
  }

  nextServed(tableId: number): ServedEvent | null {
    const idx = this.served.findIndex((e) => e.tableId === tableId);
    if (idx === -1) return null;
    return this.served.splice(idx, 1)[0];
  }
}
