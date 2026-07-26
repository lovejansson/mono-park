export default class SpritesheetsManager {

  private spritesheets: Map<string, Spritesheet>;

  constructor() {
    this.spritesheets = new Map();
  }

  /**
   * Adds a spritesheet to be created.
   *
   * @param name The name to reference the spritesheet.
   * @param image The name to reference the image for the spritesheet, should be registered in the ImagesManager!
   * @param json The json file definition for the spritesheet from Aseprite.
   */
  create(name: string, image: string, json: AsepriteJSON): void {
    this.spritesheets.set(name, { image: image, data: json });
  }

  /**
   * Gets a spritesheet by name.
   * @param name The name for the spritesheet.
   * @returns The Spritesheet.
   * @throws SpritesheetNotAddedError if the spritesheet has not been created yet.
   */
  get(name: string): Spritesheet {
    const s = this.spritesheets.get(name);
    if (!s) throw new SpritesheetNotAddedError(name);
    return s;
  }
}


export class SpritesheetNotAddedError extends Error {
  constructor(key: string) {
    super(`Spritesheet: ${key} not added`);
  }
}

export type Spritesheet = {
  data: AsepriteJSON;
  image: string;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Size = {
  w: number;
  h: number;
};

export type AsepriteFrame = {
  filename: string;
  frame: Rect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: Rect;
  sourceSize: Size;
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
  group?: string;
  opacity?: number;
  blendMode?: string;
};

export type AsepriteMeta = {
  app: string;
  version: string;
  image: string;
  format: string;
  size: Size;
  scale: string;
  frameTags: AsepriteFrameTag[];
  layers: AsepriteLayer[];
  slices: any[];
};

export type AsepriteJSON = {
  frames: AsepriteFrame[];
  meta: AsepriteMeta;
};