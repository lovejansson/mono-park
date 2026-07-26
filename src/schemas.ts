import { boolean, z } from "zod";

// Schemas to parse objects for the tilemap from pim-tiles to make sure correct data is added. */

const vec2 = z.object({ x: z.number(), y: z.number() });

const baseObject = z.object({
  image: z.string(),
  width: z.number(),
  height: z.number(),
  pos: vec2,
  name: z.string(),
  objectType: z.string(),
  meta: z.object({
    layer: z.number().int(),
    category: z.string(),
  }),
  data: z.record(z.string(), z.unknown()).default({}),
});

const benchObject = baseObject.extend({
  objectType: z.literal("bench"),
  data: z.object({isAtSkatePark: boolean()}),
});

const houseObject = baseObject.extend({
  objectType: z.literal("house"),
  data: z
    .object({
      door: z.string(),
      doorX: z.number(),
      doorY: z.number(),
    })
    .loose(),
});

const bowlObject = baseObject.extend({
  objectType: z.literal("bowl"),
  data: z.object({}),
});

const vendingMachineObject = baseObject.extend({
  objectType: z.literal("vending-machine"),
  data: z.object({}),
});
const bridgeObject = baseObject.extend({
  objectType: z.literal("bridge"),
  data: z.object({}),
});

const railObject = baseObject.extend({
  objectType: z.literal("rail"),
  data: z.object({}),
});

const tableObject = baseObject.extend({
  objectType: z.literal("table"),
  data: z.object({
    restaurants: z.array(z.string()).default([]),
  }),
});

const staticImageObject = baseObject.extend({
  objectType: z.literal("static-image"),
  data: z.object({}),
});

const objectSchemas = {
  bench: benchObject,
  table: tableObject,
  "static-image": staticImageObject,
  "vending-machine": vendingMachineObject,
  bowl: bowlObject,
  rail: railObject,
  house: houseObject,
  bridge: bridgeObject,
} as const;

export type ParsedObject =
  | z.infer<typeof benchObject>
  | z.infer<typeof tableObject>
  | z.infer<typeof bowlObject>
  | z.infer<typeof railObject>
  | z.infer<typeof bridgeObject>
  | z.infer<typeof vendingMachineObject>
  | z.infer<typeof staticImageObject>
  | z.infer<typeof houseObject>;

export function parseObject(raw: unknown): ParsedObject {
  const base = baseObject.parse(raw);
  const schema = objectSchemas[base.objectType as keyof typeof objectSchemas];
  if (!schema) {
    throw new Error(`Unknown objectType '${base.objectType}'`);
  }
  return schema.parse(raw);
}
