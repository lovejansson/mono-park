import { GroundArea } from "./Grid";
import type Scene from "./Scene";
import type { Tile } from "./types";
import { tileToPos, isSameTile } from "./utils";

export enum ResolutionResult {
  MOVE,
  WAIT,
}

type MoveIntent = {
  currentTile: Tile;
  nextTile: Tile;
  wait: number;
  result: ResolutionResult | null;
};

export default class PathCollisionManager {
  private intents: Map<number, MoveIntent>;
  private scene: Scene;
 

  constructor(scene: Scene) {
    this.scene = scene;
   
    this.intents = new Map();
  }

  pushIntent(id: number, currentTile: Tile, nextTile: Tile) {
    this.intents.set(id, { currentTile, nextTile, wait: 0, result: null });
  }

  commitMove(id: number) {
    const currPathState = this.getPathState(id);

    this.scene.grid.unoccupyTile(
      id,
      tileToPos(currPathState.currentTile, this.scene.art.tileSize),
    );

    if (
      this.scene.grid.isTileOccupied(currPathState.nextTile) &&
      this.scene.grid.getSpriteAtOccupiedTile(currPathState.nextTile) === id
    ) {
      // Sprite occupied some tile prehand and is therefore allowed to walk on their own tile

      this.deletePathState(id);
      return;
    }

    this.scene.grid.occupyTile(
      id,
      tileToPos(currPathState.nextTile, this.scene.art.tileSize),
    );

    this.deletePathState(id);
  }

  /**
   * Gets the resolution result for a sprite.
   */
  getResolution(id: number) {
    const currPathState = this.getPathState(id);

    if (currPathState.result === null)
      throw new Error("No resolution result found for " + id);

    return { tile: currPathState.nextTile, result: currPathState.result };
  }

  /**
   * The conflict resolution phase.
   *
   * Resolves all registered intents for moving a tile by deciding which sprite gets to move and which has to wait.
   */
  resolve() {
    // 1. Group all of the intents for the same tile.

    const tileGroups: Map<
      string,
      { nextTile: Tile; id: number; wait: number; currTile: Tile }[]
    > = new Map();

    let tileKey = "";
    let existingValue:
      | { nextTile: Tile; id: number; wait: number; currTile: Tile }[]
      | undefined = undefined;

    for (const [id, state] of this.intents) {
      tileKey = `${state.nextTile.row}:${state.nextTile.col}`;
      existingValue = tileGroups.get(tileKey);

      if (existingValue) {
        existingValue.push({
          nextTile: state.nextTile,
          id,
          wait: state.wait,
          currTile: state.currentTile,
        });
      } else {
        tileGroups.set(tileKey, [
          {
            id,
            nextTile: state.nextTile,
            currTile: state.currentTile,
            wait: state.wait,
          },
        ]);
      }
    }

    // 2. Decide which sprite in each group who gets to move while increasing wait tick for the ones who need to wait

    let tile = { row: 0, col: 0 };

    for (const [_, sprites] of tileGroups) {
      tile = sprites[0].nextTile;

      // If some sprite occupied a tile prehand (spots) , they can have it.
      if (this.scene.grid.isTileOccupied(tile)) {
        const spriteAtTile = this.scene.grid.getSpriteAtOccupiedTile(tile);

        for (const s of sprites) {
          if (s.id === spriteAtTile) {
            this.setResolutionResult(s.id, ResolutionResult.MOVE);
          } else {
            this.setResolutionResult(s.id, ResolutionResult.WAIT);
          }
        }

        continue;
      }

      // if (!this.scene.grid.isTileWalkable(tile, this.walkableTiles)) {
      //   throw new Error(
      //     "Path should not have been created on a non walkable tile",
      //   );
      // }
      // Pick sprite with longest wait time

      let candidate = 0;
      let maxWait = -1;

      for (const s of sprites) {
        if (s.wait > maxWait) {
          candidate = s.id;
          maxWait = s.wait;
        }
      }

      for (const s of sprites) {
        if (s.id === candidate) {
          this.setResolutionResult(s.id, ResolutionResult.MOVE);
        } else {
          this.setResolutionResult(s.id, ResolutionResult.WAIT);
        }
      }
    }
  }

  hasMoveIntent(id: number): boolean {
    return this.intents.has(id);
  }

  hasResolutionresult(id: number): boolean {
    if (!this.hasMoveIntent(id)) return false;

    const currPathState = this.getPathState(id);

    return currPathState.result !== null;
  }

  cancelMoveIntent(id: number): void {
    this.intents.delete(id);
  }

  private deletePathState(id: number): void {
    if (!this.intents.has(id))
      throw new Error(`Path state for sprite not found!`);
    this.intents.delete(id);
  }

  private setResolutionResult(id: number, result: ResolutionResult): void {
    const currState = this.getPathState(id);

    currState.result = result;

    if (result === ResolutionResult.WAIT) {
      currState.wait++;
    }
  }

  private getPathState(id: number): MoveIntent {
    const currPathState = this.intents.get(id);

    if (currPathState === undefined)
      throw new Error(`Path state for sprite not found!`);

    return currPathState;
  }
}
