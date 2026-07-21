import Art from "./Art.ts";

/**
 * Base abstract class for scenes in the game.
 */
export default abstract class Scene {
    /**
     * The Art instance this scene belongs to.
     */
    art: Art | null;

    constructor() {
        if (new.target === Scene) {
            throw new TypeError("Cannot construct Scene instances directly");
        }
        this.art = null; // Will be set by the Art class on initialization
    }

    /**
     * Initialize the scene (load assets, setup objects, etc.)
     */
    abstract init(): Promise<void>;

    /**
     * Draw the scene to the canvas.
     */
    abstract draw(ctx: CanvasRenderingContext2D): void;

    /**
     * Update the scene state (game logic, animations, etc.)
     * Optional to override if needed.
     */
    update(elapsed: number): void {
        // Can be overridden by subclasses
    }

    /**
     * Called when the scene starts.
     * Optional to override if needed.
     */
    start(): void {
        // Can be overridden by subclasses
    }

    /**
     * Called when the scene stops.
     * Optional to override if needed.
     */
    stop(): void {
        // Can be overridden by subclasses
    }
}