import { GroundArea } from "./Grid";
import type Scene from "./Scene";
import type { Cell } from "./types";
import { cellToPos, isSameCell } from "./utils";

export enum ResolutionResult {
  MOVE,
  WAIT,
}

type MoveIntent = {
  currentTile: Cell;
  nextTile: Cell;
  wait: number;
  result: ResolutionResult | null;
};

export default class PathCollisionManager {
  private intents: Map<number, MoveIntent>;
  private scene: Scene;
  private walkableTiles: GroundArea[];

  constructor(scene: Scene) {
    this.scene = scene;
    this.walkableTiles = [GroundArea.GRASS, GroundArea.GRAVEL];
    this.intents = new Map();
  }

  setWalkableTiles(groundAreas: GroundArea[]): void {
    this.walkableTiles = groundAreas;
  }

  pushIntent(id: number, currentTile: Cell, nextTile: Cell) {
    // console.log("PUSH INTENT");

    this.intents.set(id, { currentTile, nextTile, wait: 0, result: null });
  }

  commitMove(id: number, tile: Cell) {
    const currPathState = this.getPathState(id);

    // console.log("COMMIT MOVE");
    // console.log(id, currPathState.currentTile, currPathState.nextTile);

    this.scene.grid.unoccupyTile(
      cellToPos(currPathState.currentTile, this.scene.art.tileSize),
    );

    this.scene.grid.occupyTile(id, cellToPos(tile, this.scene.art.tileSize));

    this.deletePathState(id);
  }

  /**
   * Gets the resolution result for a sprite.
   */
  getResolution(id: number) {
    const currPathState = this.getPathState(id);

    if (currPathState.result === null)
      throw new Error(
        "Resolve phase has not been executed yet, no resolution result exists",
      );

    return { tile: currPathState.nextTile, result: currPathState.result };
  }

  /**
   * The conflict resolution phase.
   *
   * Resolves all registered intents for moving a tile by deciding which sprite gets to move and which gets to stay and wait.
   */
  resolve() {
    // 1. Group all of the intents for the same tile.

    const tileGroups: Map<string, { tile: Cell; id: number; wait: number,curr: Cell }[]> =
      new Map();

    let tileKey = "";
    let existingValue: { tile: Cell; id: number; wait: number, curr: Cell }[] | undefined =
      undefined;

    for (const [id, state] of this.intents) {
      tileKey = `${state.nextTile.row}:${state.nextTile.col}`;
      existingValue = tileGroups.get(tileKey);

      if (existingValue) {
        existingValue.push({ tile: state.nextTile, id, wait: state.wait,   curr: state.currentTile, });
      } else {
        tileGroups.set(tileKey, [
          {
            id,
            tile: state.nextTile,
            curr: state.currentTile,
            wait: state.wait,
          },
        ]);
      }
    }

    // 2. Decide which sprite in each group who gets to move while increasing wait tick for the ones who need to wait.

    let tileNumbers = [0, 0];
    let tile = { row: 0, col: 0 };

    if(tileGroups.size > 0)  console.log(tileGroups)

   
    // console.log(this.scene.grid.isTileWalkable({row: 20, col: 10}, this.walkableTiles))


    for (const [tileKey, sprites] of tileGroups) {
      tileNumbers = tileKey.split(":").map(Number);
      tile = {
        row: tileNumbers[0],
        col: tileNumbers[1],
      };

      const ground = this.scene.grid.getGround(tile);

      // console.log(ground, this.scene.grid.isTileOccupied(tile));

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

      if (
        this.scene.grid.isTileWalkable(
          { row: tileNumbers[0], col: tileNumbers[1] },
          this.walkableTiles,
        )
      ) {
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
      } else {
        // If tile is not walkable everyone has to wait
        for (const s of sprites) {
          this.setResolutionResult(s.id, ResolutionResult.WAIT);
        }
      }
    }

    // Check if any "WAIT" results could be a "MOVE" based on the fact that the sprite in the tile next to them is about to move.

    // for (const [id, state] of this.intents) {
    //   if (state.result === ResolutionResult.WAIT) {
    //     for (const [id2, state2] of this.intents) {
    //       if (
    //         state2.result === ResolutionResult.MOVE &&
    //         this.scene.grid.isTileOccupied(state.nextTile) &&
    //         this.scene.grid.getSpriteAtOccupiedTile(state.nextTile) === id2 &&
    //         isSameCell(state2.currentTile, state.nextTile)
    //       ) {
    //         this.setResolutionResult(id, ResolutionResult.MOVE);
    //       }
    //     }
    //   }
    // }
  }

  hasMoveIntent(id: number): boolean {
    return this.intents.has(id);
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
