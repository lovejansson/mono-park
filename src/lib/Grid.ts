import { createGrid, getRandomFreeCell } from "../grid";
import type Scene from "./Scene";
import type { Cell, Vec2 } from "./types";
import { posToCell } from "./utils";

type OccupiedTileState = Map<string, { ground: GroundArea; sprite: number }>;
type TempBlockedTileState = Map<string, { ground: GroundArea; sprite: number }>;

export enum GroundArea {
  GRASS,
  NOT_WALKABLE,
  STROLL_SPOT,
  GRAVEL,
  BRICKS,
  SKATE_GROUND,
  TRICK_GROUND,
  POND,
  OCCUPIED,
  TEMP_BLOCK,
  BRIDGE,
}

export default class Grid {
  private grid: GroundArea[][];
  private occupiedTileState: OccupiedTileState;
  private tempBlockedTileState: TempBlockedTileState;
  private scene: Scene;
  isActive: boolean;

  constructor(scene: Scene) {
    this.occupiedTileState = new Map();
    this.tempBlockedTileState = new Map();
    this.grid = [];
    this.scene = scene;
    this.isActive = false;
  }

  init(rows: number, cols: number) {
    this.grid = createGrid(rows, cols, GroundArea.NOT_WALKABLE);
    this.isActive = true;
  }

  setTileValue(row: number, col: number, value: GroundArea) {
    if (this.isActive && this.grid.length === 0)
      throw new Error("Grid is uninitialized!");
    this.grid[row][col] = value;
  }

  getGrid(): GroundArea[][] {
    if (this.isActive && this.grid.length === 0)
      throw new Error("Grid is uninitialized!");
    return this.grid;
  }

  getGround(tile: Cell): GroundArea {
    if (this.isActive && this.grid.length === 0)
      throw new Error("Grid is uninitialized!");
    if (!this.isWithinGridBounds(tile.row, tile.col)) {
      throw new Error("Tile is out of bounds");
    }

    const groundTile = this.grid[tile.row][tile.col];

    if (groundTile == GroundArea.OCCUPIED) {
      const occupiedState = this.occupiedTileState.get(this.getTileKey(tile));

      if (occupiedState === undefined)
        throw new Error(
          "Invalid occupied tile state, missing ground information.",
        );

      return occupiedState.ground;
    }

    return groundTile;
  }

  getRandomFreeCell(walkableTiles?: GroundArea[]): Cell | null {
    if (this.isActive && this.grid.length === 0)
      throw new Error("Grid is uninitialized!");
    return getRandomFreeCell(this.grid, walkableTiles);
  }

  isTileWalkable(
    tile: Cell,
    walkableTiles: GroundArea[] = [GroundArea.GRASS],
  ): boolean {
    if (this.isActive && this.grid.length === 0)
      throw new Error("Grid is uninitialized!");

    if (!this.isWithinGridBounds(tile.row, tile.col))
      throw new Error(`Tile out of bounds: ${tile.row}:${tile.col}`);

    const groundTile = this.getGround(tile);

    return (
      walkableTiles.includes(groundTile) &&
      !this.isTileOccupied(tile)
    );
  }

  getSpriteAtOccupiedTile(tile: Cell): number {
    const key = this.getTileKey(tile);
    const state = this.occupiedTileState.get(key);

    if (state === undefined) throw new Error("Tile is not occupied!");

    return state.sprite;
  }

  isTileOccupied(tile: Cell): boolean {
    return this.occupiedTileState.has(this.getTileKey(tile));
  }

  blockTile(id: number, pos: Vec2) {
    const { row, col } = this.getGridCellFromPos(pos);
    const key = this.getTileKey({ row, col });

    if (this.tempBlockedTileState.has(key)) {
      throw new Error(`Tile is  already temporary blocked ${row}:${col}`);
    }

    this.tempBlockedTileState.set(key, {
      ground: this.grid[row][col],
      sprite: id,
    });

    this.grid[row][col] = GroundArea.TEMP_BLOCK;
  }

  unBlockTile(id: number, pos: Vec2): void {
    const { row, col } = this.getGridCellFromPos(pos);
    const key = this.getTileKey({ row, col });
    const state = this.tempBlockedTileState.get(key);

    if (state === undefined)
      throw new Error("This tile is not temporary blocked");
    if (state.sprite !== id)
      throw new Error(`Tile is temporary blocked by other sprite`);

    this.grid[row][col] = state.ground;
    this.tempBlockedTileState.delete(key);
  }

  occupyTile(id: number, pos: Vec2): void {
    const { row, col } = this.getGridCellFromPos(pos);
    const key = this.getTileKey({ row, col });

    if (this.occupiedTileState.has(key)) {
      throw new Error(`Tile is  already occupied ${row}:${col}`);
    }

    this.occupiedTileState.set(key, {
      ground: this.grid[row][col],
      sprite: id,
    });

    this.grid[row][col] = GroundArea.OCCUPIED;
  }

  unoccupyTile(id: number, pos: Vec2, cooldown?: number): void {
    const { row, col } = this.getGridCellFromPos(pos);

    const key = this.getTileKey({ row, col });
    const state = this.occupiedTileState.get(key);

    if (state === undefined) throw new Error("This tile is not occupied");

    if (state.sprite !== id)
      throw new Error(`Tile is occupied by other sprite`);

    if (cooldown) {
      setTimeout(() => {
        this.grid[row][col] = state.ground;
        this.occupiedTileState.delete(key);
      }, cooldown);
    } else {
      this.grid[row][col] = state.ground;
      this.occupiedTileState.delete(key);
    }
  }

  private getGridCellFromPos(pos: Vec2): Cell {
    const tile = posToCell(pos, this.scene.art.tileSize);
    // console.dir(tile);
    if (tile.row % 1 !== 0 || tile.col % 1 !== 0)
      throw new Error("Not a whole tile");
    if (
      tile.row < 0 ||
      tile.row >= this.grid.length ||
      tile.col < 0 ||
      tile.col >= this.grid[0].length
    ) {
      throw new Error("Grid cell is out of bounds");
    }

    return tile;
  }

  private getTileKey(tile: Cell): string {
    return `${tile.row},${tile.col}`;
  }

  private isWithinGridBounds(row: number, col: number): boolean {
    return (
      row >= 0 &&
      row < this.grid.length &&
      col >= 0 &&
      col < this.grid[0].length
    );
  }
}
