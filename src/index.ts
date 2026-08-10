import { Art } from "./lib/index.ts";
import { createDebugLogger } from "./debugger.ts";
import Play from "./Play.ts";
import Pause from "./Pause.ts";
import tilemapJSON from "./assets/tilemap.json";
import type { Tilemap } from "./types.ts";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";

if (isTauri()) {
  const appWindow = getCurrentWindow();
  appWindow.onResized(async () => {
  
    const isFullscreen = await appWindow.isFullscreen();
    const header = document.querySelector("header");

    if (isFullscreen) {
      if (!header?.classList.contains("hidden")) {
        header?.classList.toggle("hidden");
      }
    } else {
      if (header?.classList.contains("hidden")) {
        header?.classList.toggle("hidden");
      }
    }
  });
}

const btnMin = document.getElementById("btn-min");
const btnMax = document.getElementById("btn-max");
const btnClose = document.getElementById("btn-close");

if (btnMin === null || btnMax === null || btnClose === null)
  throw new Error("window buttons not found");

btnMin.addEventListener("click", async () => {
  if (isTauri()) {
    const appWindow = getCurrentWindow();

    await appWindow.minimize();
  }
});

btnMax.addEventListener("click", async () => {
  if (isTauri()) {
    art.enterFullScreen();
    // const appWindow = getCurrentWindow();
    // await appWindow.setFullscreen(true);
  }
});
btnClose.addEventListener("click", async () => {
  if (isTauri()) {
    const appWindow = getCurrentWindow();

    await appWindow.close();
  }
});

// await appWindow.onFullscreenChanged(({ payload: fullscreen }) => {
//   document.body.classList.toggle("fullscreen", fullscreen);
// });

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
