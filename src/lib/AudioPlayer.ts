export default class AudioPlayer {
  onoff: boolean;
  private sounds: Map<string, string>;
  private buffers: Map<string, AudioBuffer>;

  private playingAudioNodes: Map<
    string,
    { source: AudioBufferSourceNode; volume: GainNode; isOn: boolean }
  >;
  private audioCtx: AudioContext;
  private muteNode: GainNode;

  constructor() {
    this.sounds = new Map();
    this.buffers = new Map();
    this.playingAudioNodes = new Map();
    this.onoff = false;

    this.audioCtx = new window.AudioContext();
    this.muteNode = this.audioCtx.createGain();
    this.muteNode.connect(this.audioCtx.destination);
  }

  async add(id: string, path: string): Promise<void> {
    this.sounds.set(id, path);
  }

  async load(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [id, path] of this.sounds) {
      promises.push(
        (async () => {
          try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer =
              await this.audioCtx.decodeAudioData(arrayBuffer);
            this.buffers.set(id, audioBuffer);
          } catch (err: any) {
            throw new AudioFetchError(path, err);
          }
        })(),
      );
    }

    await Promise.all(promises);
    this.sounds.clear();
  }

  isMuted(): boolean {
    return this.muteNode.gain.value === 0;
  }
  toggleSound(): void {
    this.muteNode.gain.value = this.isMuted() ? 1 : 0;
  }

  playlist(sounds: string[], volume: number = 1, loop = false): void {
     if (!this.onoff) return;
    this.play(sounds[0], volume);

    const audio = this.playingAudioNodes.get(sounds[0]);

    if (audio === undefined)
      throw new Error("Failed to start next playlist track");

    audio.source.addEventListener("ended", () => {
       if (!this.onoff) return;
        this.nextInPlaylist(sounds, 0, volume, loop);
      
    });
  }

  private nextInPlaylist(
    sounds: string[],
    currIdx: number,
    volume: number = 1,
    loop = false,
  ): void {
     if (!this.onoff) return;
    if (currIdx === sounds.length - 1) {
      if (loop) {
        currIdx = 0;
      } else {
        return;
      }
    } else {
      currIdx += 1;
    }

    this.play(sounds[currIdx], volume);

    const audio = this.playingAudioNodes.get(sounds[currIdx]);

    if (audio === undefined)
      throw new Error("Failed to start next playlist track");

    audio.source.addEventListener("ended", () => {
      this.nextInPlaylist(sounds, currIdx, volume, loop);
    });
  }

  play(id: string, volume: number = 1, loop = false): void {
    if (!this.onoff) throw new AudioPlayerOffStateError("play");

    if (this.playingAudioNodes.has(id)) return;

    // if (this.audioCtx.state === "suspended") {
    //   throw new Error("Audio context suspended")
    // }

    const audioBuffer = this.buffers.get(id);
    if (audioBuffer === undefined) throw new AudioNotFoundError(id);

    const audioSource = this.audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.loop = loop;

    const volumeNode = this.audioCtx.createGain();
    volumeNode.connect(this.muteNode);

    volumeNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);

    audioSource.connect(volumeNode);
    audioSource.start();

    this.playingAudioNodes.set(id, {
      source: audioSource,
      volume: volumeNode,
      isOn: true,
    });

    audioSource.addEventListener("ended", () => {
      this.playingAudioNodes.delete(id);
    });
  }

  isPlaying(id: string): boolean {
    return this.playingAudioNodes.has(id);
  }

  stop(id: string): void {
    const audio = this.playingAudioNodes.get(id);

    if (audio === undefined) throw new Error("Audio not on");

    audio.source.stop();
  }

  setVolume(id: string, volume: number): void {
    const audio = this.playingAudioNodes.get(id);

    if (audio === undefined) throw new Error("Audio not on");

    if (volume < 0 || volume > 1) throw new InvalidVolumeRangeError(volume);

    audio.volume.gain.setValueAtTime(volume, this.audioCtx.currentTime);
  }

  onOffSwitch(): void {
    this.onoff = !this.onoff;
    if (!this.onoff) this.turnOffAllAudios();
  }

  beep(
    frequency: number = 1000,
    duration: number = 200,
    volume: number = 0.2,
    type: OscillatorType = "square",
  ) {
    const audioCtx = new AudioContext();

    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.value = volume;

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration / 1000);

    oscillator.onended = () => {
      audioCtx.close();
    };
  }

  private turnOffAllAudios(): void {
    for (const a of this.playingAudioNodes.values()) {
      a.source.stop();
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
