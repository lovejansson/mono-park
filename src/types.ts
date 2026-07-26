import type { Vec2 } from "./lib";

export type AttributePrimitive = string | number | boolean;
export type AttributeObject = { [key: string]: AttributeValue };
export type AttributeValue = AttributePrimitive | AttributeValue[] | AttributeObject;

export type Tilemap = {
  tilemap: string;
  name: string;
  tileSize: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  attributes: { pos: Vec2; attributes: { [key: string]: AttributeValue } }[];
  objects: TilemapObject[];
};

export type TilemapObject = {
  image: string;
  width: number;
  height: number;
  pos: Vec2;
  name: string;
  objectType: string;
  meta: {
    layer: number;
    category: string;
  };
  data: { [key: string]: AttributeValue };
};
