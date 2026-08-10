import Art from "./Art.ts";
import type ArtObject from "./objects/ArtObject.ts";

export default abstract class Scene {
  art!: Art; // Will be set when scene is initialized, using ! to avoid null checks all over
  objects: ArtObject[];

  constructor() {
    if (new.target === Scene) {
      throw new TypeError("Cannot construct Scene instances directly");
    }
    this.objects = [];
  }

  abstract init(): Promise<void>;

  addObject(obj: ArtObject): void {
    if (this.objects.some((o) => o.id === obj.id))
      throw new Error(`Object with id ${obj.id} is already added to scene.`);
    this.objects.push(obj);
  
  }

  removeObject(obj: ArtObject): void {
    this.objects = this.objects.filter((o) => o.id !== obj.id);
  }

  sortObjects(compareFn: (a: ArtObject, b: ArtObject) => number): void {
    this.objects.sort(compareFn);
  }

  update(dt: number): void {
  
    for (const obj of this.objects) {
      obj.update(dt);
    }
  }

  start(): void {
    // Can be overridden by subclasses
  }

  stop(): void {
    // Can be overridden by subclasses
  }
}
