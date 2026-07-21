import { Art } from "./lib/index.ts";
import { createDebugLogger } from "./debugger.ts";
import Play from "./Play.ts";
import Pause from "./Pause.ts";
import "./audio-player/AudioPlayerElement.ts";

export const debug = createDebugLogger(true);

const art = new Art({ 
    pause: new Pause(),
    play: new Play(),
    width: 320,
    height: 180,
    tileSize: 16,
    canvas: "#canvas-art",
    displayGrid: false,
});

// TODO: 
// 1. Implement Play and Pause scenes
// 2. start and play the art instance

