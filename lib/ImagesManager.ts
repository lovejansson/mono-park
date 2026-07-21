export default class ImagesManager {
    #images: Map<string, HTMLImageElement>;
    #paths: Map<string, string>;

    constructor() {
        this.#images = new Map();
        this.#paths = new Map();
    }

    /**
     * Adds an image to be loaded later.
     * @param name The key to reference the image.
     * @param path The URL or path to the image file.
     */
    add(name: string, path: string): void {
        this.#paths.set(name, path);
    }

    /**
     * Loads all images that have been added.
     */
    async load(): Promise<void> {
        const loadPromises: Promise<[string, HTMLImageElement]>[] = [];

        for (const [name, path] of this.#paths.entries()) {
            const image = new Image();

            const loadPromise = new Promise<[string, HTMLImageElement]>((resolve, reject) => {
                image.addEventListener("load", () => resolve([name, image]));
                image.addEventListener("error", (e: any) => reject(new LoadImageError(name, path, e?.error?.message ?? "unknown")));
            });

            image.src = path;
            loadPromises.push(loadPromise);
        }

        const loadedImages = await Promise.all(loadPromises);
        for (const [name, image] of loadedImages) {
            this.#images.set(name, image);
        }

        this.#paths.clear();
    }

    /**
     * Retrieves a loaded image by name.
     * @param name The key for the image.
     * @returns The HTMLImageElement.
     * @throws ImageNotLoadedError if the image has not been loaded yet.
     */
    get(name: string): HTMLImageElement {
        const image = this.#images.get(name);
        if (!image) throw new ImageNotLoadedError(name);
        return image;
    }
}

/* ------------------ Error classes ------------------ */

export class ImageNotLoadedError extends Error {
    constructor(imageName: string) {
        super(`Image: ${imageName} not loaded`);
    }
}

export class LoadImageError extends Error {
    constructor(name: string, path: string, inner: string) {
        super(`Failed to load image: ${name} at: ${path} bc: ${inner}`);
    }
}