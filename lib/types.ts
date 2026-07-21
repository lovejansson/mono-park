export type Vec2 = { x: number; y: number };

export type Direction = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type AsepriteRect = { x: number; y: number; w: number; h: number };

export type AsepriteFrameData = {
  frame: AsepriteRect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: AsepriteRect;
  sourceSize: { w: number; h: number };
  duration: number;
};

export type AsepriteFrameTag = {
  name: string;
  from: number;
  to: number;
  direction: "forward" | "reverse" | "pingpong";
  color?: string;
};

export type AsepriteLayer = {
  name: string;
  opacity: number;
  blendMode: string;
};

export type AsepriteMeta = {
  app: string;
  version: string;
  image: string;
  format: string;
  size: { w: number; h: number };
  scale: string;
  frameTags: AsepriteFrameTag[];
  layers: AsepriteLayer[];
  slices: any[];
};

export type AsepriteJSON = {
  frames: Record<string, AsepriteFrameData>;
  meta: AsepriteMeta;
};
