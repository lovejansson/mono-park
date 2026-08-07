
import { Art } from "./lib/index.ts";
import { createDebugLogger } from "./debugger.ts";
import Play from "./Play.ts";
import Pause from "./Pause.ts";
import tilemapJSON from "./assets/tilemap.json";
import type { Tilemap } from "./types.ts";

export const debug = createDebugLogger(true);

const tilemap = tilemapJSON as unknown as Tilemap;

const art = new Art({
  pause: new Pause(),
  play: new Play(tilemap),
  width: tilemap.width,
  height: tilemap.height,
  tileSize: tilemap.tileSize,
  container: "#art-container",
  displayGrid: true,
});

(async () => {

  await art.init();
  art.play();
  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "f") {
      art.enterFullScreen();
    }
  });
})();
