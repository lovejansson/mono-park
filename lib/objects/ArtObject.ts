import Scene from "../Scene.js";

export default abstract class ArtObject {
    id: number;
    scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;

        if(scene.art === null) throw new Error("art instance is not set on scene object");
        
        this.id = scene.art.getId();
    }

    update(elapsed: number): void {}

    abstract draw(ctx: CanvasRenderingContext2D): void;
}