import type Table from "./Table";

export enum OrderEventType {
  TAKE,
  SERVE,
}
export type OrderEvent = {
  type: OrderEventType;
  table: Table;
  guests: string;
};

/**
 * A manager to create and listen for orders or guests arriving to the café!
 */
export default class OrdersManager {
  private takeOrders: OrderEvent[];
  private pendingOrders: OrderEvent[];

  constructor() {
    this.takeOrders = [];
    this.pendingOrders = [];
  }

  /**
   * Guests are calling arrive to notify waiter to take their order.
   */
  takeOrder(table: Table, guests: string): void {
    this.takeOrders.push({ type: OrderEventType.TAKE, table, guests });
  }

  /**
   * Waiters are checking if any guests like to order something.
   */
  nextTakeOrder(): OrderEvent | null {
    return this.takeOrders.shift() ?? null;
  }

  /**
   * Guests actually place an order.
   */
  order(table: Table, guests: string): void {
    this.takeOrders.push({ type: OrderEventType.SERVE, table, guests });
  }

  /**
   * Waiters are checking if an order is ready to be served.
   */
  nextPendingOrder(): OrderEvent | null {
    return this.pendingOrders.shift() ?? null;
  }
}
