export default class AudioPlayer {
    onoff: boolean;
    #sounds: Map<string, string>;
    #buffers: Map<string, AudioBuffer>;
    #playingAudioNodes: Map<string, AudioBufferSourceNode>;
    #audioCtx: AudioContext;
    #volumeNode: GainNode;

    constructor() {
        this.#sounds = new Map();
        this.#buffers = new Map();
        this.#playingAudioNodes = new Map();
        this.onoff = false;

        this.#audioCtx = new window.AudioContext();
        this.#volumeNode = this.#audioCtx.createGain();
        this.#volumeNode.connect(this.#audioCtx.destination);
    }

    async add(id: string, path: string): Promise<void> {
        this.#sounds.set(id, path);
    }

    async load(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const [id, path] of this.#sounds) {
            promises.push(
                (async () => {
                    try {
                        const response = await fetch(path);
                        const arrayBuffer = await response.arrayBuffer();
                        const audioBuffer = await this.#audioCtx.decodeAudioData(arrayBuffer);
                        this.#buffers.set(id, audioBuffer);
                    } catch (err: any) {
                        throw new AudioFetchError(path, err);
                    }
                })()
            );
        }

        await Promise.all(promises);
        this.#sounds.clear();
    }

    play(id: string, loop = false): void {
        if (!this.onoff) throw new AudioPlayerOffStateError("play");

        if (this.#playingAudioNodes.has(id)) return; // already playing

        if (this.#audioCtx.state === "suspended") this.#audioCtx.resume();

        const audioBuffer = this.#buffers.get(id);
        if (!audioBuffer) throw new AudioNotFoundError(id);

        const audioSource = this.#audioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.loop = loop;

        audioSource.connect(this.#volumeNode);
        audioSource.start();

        this.#playingAudioNodes.set(id, audioSource);
        audioSource.addEventListener("ended", () => {
            this.#playingAudioNodes.delete(id);
        });
    }

    isPlaying(id: string): boolean {
        return this.#playingAudioNodes.has(id);
    }

    stop(id: string): void {
        const source = this.#playingAudioNodes.get(id);
        if (source) {
            source.stop();
        }
    }

    setVolume(volume: number): void {
        if (volume < 0 || volume > 1) throw new InvalidVolumeRangeError(volume);
        this.#volumeNode.gain.setValueAtTime(volume, this.#audioCtx.currentTime);
    }

    onOffSwitch(): void {
        this.onoff = !this.onoff;
        if (!this.onoff) this.turnOffAllAudios();
    }

    private turnOffAllAudios(): void {
        for (const audioSource of this.#playingAudioNodes.values()) {
            audioSource.stop();
        }
    }
}

/* ------------------ Error classes ------------------ */

export class InvalidVolumeRangeError extends Error {
    constructor(volume: number) {
        super(`Volume: ${volume} is not within valid range 0-1.`);
    }
}

export class AudioNotFoundError extends Error {
    constructor(id: string) {
        super(`Audio with id: ${id} does not exist.`);
    }
}

export class AudioFetchError extends Error {
    constructor(path: string, error: Error) {
        super(`Unable to fetch audio file: ${path}. Error: ${error.message}`);
    }
}

export class AudioPlayerOffStateError extends Error {
    constructor(funcName: string) {
        super(`Failed to execute: ${funcName}`);
    }
}