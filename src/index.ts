import { Art } from "./lib/index.ts";
import { createDebugLogger } from "./debugger.ts";
import Play from "./Play.ts";
import tilemapJSON from "./assets/tilemap.json";
import type { Tilemap } from "./types.ts";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";

export const debug = createDebugLogger(true);

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);

  if (element === null) {
    throw new Error(`Element #${id} not found`);
  }

  return element as T;
};

const btnPlay = getElement<HTMLButtonElement>("btn-play");
const btnSound = getElement<HTMLButtonElement>("btn-sound");
const btnMin = getElement<HTMLButtonElement>("btn-min");
const btnMax = getElement<HTMLButtonElement>("btn-max");
const btnClose = getElement<HTMLButtonElement>("btn-close");

const iconPlay = getElement<HTMLElement>("ic-play");
const iconPause = getElement<HTMLElement>("ic-pause");
const iconSoundOn = getElement<HTMLElement>("ic-sound-on");
const iconSoundOff = getElement<HTMLElement>("ic-sound-off");

const dialogError = getElement<HTMLDialogElement>("dialog-error");
const btnReload = getElement<HTMLButtonElement>("btn-reload");

const tilemap = tilemapJSON as unknown as Tilemap;

const art = new Art({
  play: new Play(tilemap),
  width: tilemap.width,
  height: tilemap.height,
  tileSize: tilemap.tileSize,
  container: "#art-container",
  loading: "#div-loading",
});

const setFullscreenClass = (fullscreen: boolean) => {
  document.body.classList.toggle("fullscreen", fullscreen);
};

const syncFullscreenState = async () => {
  if (!isTauri()) {
    setFullscreenClass(false);
    return false;
  }

  const fullscreen = await getCurrentWindow().isFullscreen();

  setFullscreenClass(fullscreen);

  return fullscreen;
};

const syncPlayIcon = () => {
  iconPlay.classList.toggle("hidden", art.isPlaying);
  iconPause.classList.toggle("hidden", !art.isPlaying);
};

const syncSoundIcon = () => {
  const soundOn = !art.audio.isMuted();

  iconSoundOn.classList.toggle("hidden", !soundOn);
  iconSoundOff.classList.toggle("hidden", soundOn);
};

const syncUI = async () => {
  await syncFullscreenState();
  syncPlayIcon();
  syncSoundIcon();
};

const toggleFullscreen = async () => {
  if (!isTauri()) return;

  const appWindow = getCurrentWindow();
  const fullscreen = await appWindow.isFullscreen();

  await appWindow.setFullscreen(!fullscreen);
  await syncFullscreenState();
};

const exitFullscreen = async () => {
  if (!isTauri()) return;

  const appWindow = getCurrentWindow();

  if (await appWindow.isFullscreen()) {
    await appWindow.setFullscreen(false);
  }

  await syncFullscreenState();
};

async function main() {
  {
    try {
      await art.init();

      await syncUI();

      if (dialogError.open) {
        dialogError.close();
      }

      btnReload.addEventListener("click", () => {
        window.navigation.reload();
        dialogError.close();
      });

      btnPlay.addEventListener("click", () => {
        if (art.isPlaying) {
          art.pause();
        } else {
          art.play();
        }

        syncPlayIcon();
      });

      btnSound.addEventListener("click", () => {
        art.audio.toggleSound();
        syncSoundIcon();
      });

      btnMin.addEventListener("click", async () => {
        if (!isTauri()) return;

        await getCurrentWindow().minimize();
      });

      btnMax.addEventListener("click", toggleFullscreen);

      btnClose.addEventListener("click", async () => {
        if (!isTauri()) return;

        await getCurrentWindow().close();
      });

      document.addEventListener("keydown", async (event) => {
        if (event.key !== "Escape") return;

        await exitFullscreen();
      });
    } catch (e) {
      console.error(e);
      dialogError.showModal();
    }
  }
}

main();
