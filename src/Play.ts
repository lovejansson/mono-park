import { ArtObject, Scene, StaticImage, type Direction } from "./lib/index.ts";
import { type Tilemap } from "./types.ts";
import { createGrid, getRandomFreeCell } from "./grid.ts";
import Obstacle, { Bowl, Flat, Rail } from "./skate-park/Obstacle.ts";
import Skater from "./skate-park/Skater.ts";
import { cellToPos } from "./lib";
import Bench from "./Bench.ts";
import spikeSkaterJSON from "./assets/spritesheets/spike-skater.json";
import spikeBaseJSON from "./assets/spritesheets/spike-base.json";
import kimSkaterJSON from "./assets/spritesheets/kim-skater.json";
import kimBaseJSON from "./assets/spritesheets/kim-base.json";
import amandaBaseJSON from "./assets/spritesheets/amanda-base.json";
import bobbySkaterJSON from "./assets/spritesheets/bobby-skater.json";
import bobbyBaseJSON from "./assets/spritesheets/bobby-base.json";
import loveSkaterJSON from "./assets/spritesheets/love-skater.json";
import loveBaseJSON from "./assets/spritesheets/love-base.json";
import jazzSkaterJSON from "./assets/spritesheets/jazz-skater.json";
import jasmineBaseJSON from "./assets/spritesheets/jazz-base.json";
import doorCafeJSON from "./assets/spritesheets/door-cafe.json";

import amandaBallerJSON from "./assets/spritesheets/amanda-baller.json";
import bobbyBallerJSON from "./assets/spritesheets/bobby-baller.json";
import kimBallerJSON from "./assets/spritesheets/kim-baller.json";
import spikeBallerJSON from "./assets/spritesheets/spike-baller.json";

import ballJSON from "./assets/spritesheets/ball.json";
import foodsCafeJSON from "./assets/spritesheets/foods.json";
import { type AsepriteJSON } from "./lib/index";
import { Door } from "./cafe/House.ts";
import { parseObject, type ParsedObject } from "./schemas.ts";
import Table from "./cafe/Table.ts";
import Cafe, { Tables } from "./cafe/Cafe.ts";
import Human from "./Human.ts";
import BallGame, { Ball, type PlayerArea } from "./ball/BallGame.ts";

export default class Play extends Scene {
  private tilemap: Tilemap;
  public obstacles: Obstacle[];
  public parkGrid: (0 | 1)[][];
  private skaters!: Skater[];
  private humans: Human[];
  public tileSize: number;
  public benches: Bench[];
  private staticImages: StaticImage[];
  private ballGame!: BallGame;

  public cafe!: Cafe;
  public tables!: Tables; // Is set in init()

  constructor(tilemap: Tilemap) {
    super();
    this.tilemap = tilemap;
    this.obstacles = [];
    this.parkGrid = [];
    this.tileSize = 16;
    this.skaters = [];
    this.benches = [];
    this.staticImages = [];
    this.humans = [];
  }

  getHuman(id: number): Human {
    const human = this.humans.find((h) => h.id === id);

    if (human === undefined) throw new Error("Human not found in scene.");

    return human;
  }

  private loadSkaterSprite(
    name: string,
    skaterJson: AsepriteJSON,
    baseJson: AsepriteJSON,
  ) {
    const skaterKey = `${name}-skater`;
    const baseKey = `${name}-base`;

    this.loadSprite(skaterKey, skaterJson);
    this.loadSprite(baseKey, baseJson);
  }

  private loadSprite(name: string, json: AsepriteJSON) {
    this.art!.images.add(name, `/sprites/${name}.png`);
    this.art!.spritesheets.create(name, name, json);
  }

  async init() {
    this.art!.images.add("tilemap", this.tilemap.tilemap);

    this.loadSkaterSprite(
      "spike",
      spikeSkaterJSON as AsepriteJSON,
      spikeBaseJSON as AsepriteJSON,
    );
    this.loadSkaterSprite(
      "kim",
      kimSkaterJSON as AsepriteJSON,
      kimBaseJSON as AsepriteJSON,
    );
    this.loadSkaterSprite(
      "bobby",
      bobbySkaterJSON as AsepriteJSON,
      bobbyBaseJSON as AsepriteJSON,
    );

    this.loadSkaterSprite(
      "jazz",
      loveSkaterJSON as AsepriteJSON,
      loveBaseJSON as AsepriteJSON,
    );

    this.loadSkaterSprite(
      "jazz",
      jazzSkaterJSON as AsepriteJSON,
      jasmineBaseJSON as AsepriteJSON,
    );

    this.loadSprite("door-cafe", doorCafeJSON as AsepriteJSON);

    this.loadSprite("foods", foodsCafeJSON as AsepriteJSON);

    this.loadSprite("ball", ballJSON as AsepriteJSON);


    this.loadSprite("amanda-base", amandaBaseJSON as AsepriteJSON);


    
    this.loadSprite("kim-baller", kimBallerJSON as AsepriteJSON);

    
    this.loadSprite("spike-baller", spikeBallerJSON as AsepriteJSON);

    
    this.loadSprite("amanda-baller", amandaBallerJSON as AsepriteJSON);


    
    this.loadSprite("bobby-baller", bobbyBallerJSON as AsepriteJSON);

   

    // This is a transparent image for a "flat" obstacle... just bc static images require an image

    this.art!.images.add(
      "flat",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAEklEQVR4nGNgGAWjYBSMglEwCjAAAGwAAWzQqWQAAAAASUVORK5CYII=",
    );

    const flat = new Flat(
      this,
      { x: 26 * this.tileSize, y: 4 * this.tileSize },
      this.art!.tileSize,
      this.art!.tileSize,
    );
    this.obstacles.push(flat);
    this.addObject(flat);

    this.parkGrid = createGrid(this.tilemap.rows, this.tilemap.cols, 1);

    this.tileSize = this.art!.tileSize;

    const tilemap = new StaticImage(
      this,
      { x: 0, y: 0 },
      this.art!.width,
      this.art!.height,
      "tilemap",
    );

    this.staticImages.push(tilemap);
    this.addObject(tilemap);

    const playerAreas: PlayerArea[] = []

    for (const t of this.tilemap.attributes) {
      const isSkateGround =
        t.attributes.hasOwnProperty("isSkateGround") &&
        t.attributes.isSkateGround === true;
      const isWalkable =
        t.attributes.hasOwnProperty("isWalkable") &&
        t.attributes.isWalkable === true;
      const isPlayerArea = t.attributes.hasOwnProperty("isPlayerArea") && t.attributes.isPlayerArea === true;

      if (isSkateGround || isWalkable) {
        this.parkGrid[t.pos.y / this.tileSize][t.pos.x / this.tileSize] = 0;
      }

      if(isPlayerArea) {
        const direction = t.attributes.playerAreaDirection;

        if(direction === undefined) throw new Error("No direction for player area");

        const playerArea = playerAreas.find(a => a.direction === direction);

        if(playerArea) {
          playerArea.positions.push({x: t.pos.x, y: t.pos.y});
         
        } else {
          playerAreas.push({direction: direction as Direction, positions: [{x: t.pos.x, y: t.pos.y}] })
        }
      }
    }


    for (const o of this.tilemap.objects) {
      const parsedObj = parseObject(o);

      this.art!.images.add(parsedObj.name, o.image);

      this.createObject(parsedObj);

      // make objects unwalkable...
      const startRow = o.pos.y / this.tileSize;
      const startCol = o.pos.x / this.tileSize;
      const endRow = startRow + o.height / this.tileSize;
      const endCol = o.pos.x / this.tileSize + o.width / this.tileSize;

      for (let r = startRow; r < endRow; ++r) {
        for (let c = startCol; c < endCol; ++c) {
          this.parkGrid[r][c] = 1;
        }
      }
    }

    this.tables = new Tables(this.objects.filter((o) => o instanceof Table));

    await this.art!.images.load();

    this.humans.push(new Human(this,  { x: 34 * this.art!.tileSize, y: 20 * this.art!.tileSize }, "spike", "play-ball"));

    this.humans.push(
      new Human(
        this,
        { x: 27 * this.art!.tileSize, y: 20 * this.art!.tileSize },
        "bobby",
        "play-ball",
      ),
    );

     this.humans.push(new Human(this,  { x: 34 * this.art!.tileSize, y: 20 * this.art!.tileSize }, "amanda", "play-ball"));

    this.humans.push(
      new Human(
        this,
        { x: 27 * this.art!.tileSize, y: 20 * this.art!.tileSize },
        "kim",
        "play-ball",
      ),
    );

    const ball = new Ball(this,  { x: 27 * this.art!.tileSize, y: 20 * this.art!.tileSize });

    ball.init();

    this.addObject(ball);


    


    this.ballGame = new BallGame(
      this,
      ball,
      this.humans[1].id,
      this.humans.map((h) => h.id),
      playerAreas
    );

    for (const h of this.humans) {
      this.addObject(h);
      h.init();
    }

    // this.pushSkater(new Skater(this, { x: 0, y: 0 }, "jasmine", 10, "bowl"));
    // this.pushSkater(new Skater(this, { x: 0, y: 0 }, "bobby", 10, "bowl"));
    // this.pushSkater(new Skater(this, { x: 0, y: 0 }, "kim", 10, "bench"));
    // this.pushSkater(new Skater(this, { x: 0, y: 0 }, "love", 10, "rail"));
  }

  getBallGame(): BallGame {
    return this.ballGame;
  }

  private createObject(o: ParsedObject): ArtObject {
    switch (o.objectType) {
      case "bench":
        const bench = new Bench(
          this,
          o.pos,
          o.width,
          o.height,
          o.data.isAtSkatePark,
        );
        this.benches.push(bench);
        this.addObject(bench);
        return bench;
      case "bowl":
        const bowl = new Bowl(this, o.pos, o.width, o.height);
        this.obstacles.push(bowl);
        this.addObject(bowl);
        return bowl;
      case "rail":
        const rail = new Rail(this, o.pos, o.width, o.height);
        this.obstacles.push(rail);
        this.addObject(rail);
        return rail;
      case "house":
        let door: Door = new Door(
          this,
          {
            x: o.pos.x + o.data.doorX,
            y: o.pos.y + o.data.doorY,
          },
          16,
          32,
          "door-cafe",
        );

        this.addObject(door);

        this.cafe = new Cafe(this, o.pos, o.width, o.height, o.name, door);

        this.addObject(this.cafe);

        return this.cafe;

      case "table":
        const table = new Table(
          this,
          o.pos,
          o.width,
          o.height,
          o.name,
          [
            {
              pos: {
                x: o.pos.x + this.tileSize,
                y: o.pos.y,
              },
              direction: "n",
            },
            {
              pos: {
                x: o.pos.x + this.art!.tileSize * 2,
                y: o.pos.y + this.art!.tileSize * 2,
              },
              direction: "e",
            },
            {
              pos: {
                x: o.pos.x + this.art!.tileSize,
                y: o.pos.y + o.height - this.art!.tileSize,
              },
              direction: "s",
            },
            {
              pos: {
                x: o.pos.x,
                y: o.pos.y + this.art!.tileSize,
              },
              direction: "w",
            },
          ],
          ["cafe"],
        );

        this.addObject(table);

        return table;
      case "vending-machine": {
        const staticImage = new StaticImage(
          this,
          o.pos,
          o.width,
          o.height,
          o.name,
        );
        this.staticImages.push(staticImage);
        this.addObject(staticImage);
        return staticImage;
      }

      case "bridge": {
        const staticImage = new StaticImage(
          this,
          o.pos,
          o.width,
          o.height,
          o.name,
        );
        this.staticImages.push(staticImage);
        this.addObject(staticImage);
        return staticImage;
      }
      case "static-image": {
        const staticImage = new StaticImage(
          this,
          o.pos,
          o.width,
          o.height,
          o.name,
        );
        this.staticImages.push(staticImage);
        this.addObject(staticImage);
        return staticImage;
      }
      default:
        throw new Error("Unsupported object");
    }
  }

  pushHuman(human: Human) {
    let cell = getRandomFreeCell(this.parkGrid);
    if (cell === null) return;

    cell = {
      col: Math.floor(this.tilemap.cols / 2) - 4,
      row: Math.floor(this.tilemap.rows / 2),
    };

    human.pos = cellToPos(cell, this.tileSize);

    this.humans.push(human);
    this.addObject(human);
  }

  pushSkater(skater: Skater) {
    const cell = getRandomFreeCell(this.parkGrid);
    if (cell === null) return;
    skater.pos = cellToPos(cell, this.tileSize);
    skater.init();
    this.skaters.push(skater);
    this.addObject(skater);
  }

  update(dt: number) {
    super.update(dt);

    this.ballGame.update(dt);
    // Sort objects

    const renderSortCompValue = new Map<number, number>();

    for (const o of this.objects) {
      renderSortCompValue.set(o.id, o.pos.y);
    }

    for (const s of this.skaters) {
      const obstacle = this.obstacles.find((o2) => o2.id === s.obstacle);

      if (obstacle !== undefined) {
        if (obstacle.type === "bowl") {
          renderSortCompValue.set(s.id, obstacle.pos.y + 1);
          continue;
        }
      }

      const bench = this.benches.find((o2) => o2.id === s.bench);

      if (bench !== undefined) {
        renderSortCompValue.set(s.id, s.pos.y + 4);
        continue;
      }

      renderSortCompValue.set(s.id, s.pos.y);
    }

    for (const h of this.humans) {
      if (h.action === "fika" && h.isSitting()) {
        const chair = this.objects.find(
          (o) =>
            o instanceof StaticImage &&
            o.image.includes("chair") &&
            o.pos.x === h.pos.x,
        );

        if (chair === undefined) throw new Error("Chair not found");

        // Sitting on the far side of a table should render behind it.
        if (h.direction === "n") {
          renderSortCompValue.set(h.id, h.pos.y - 1);
        } else {
          renderSortCompValue.set(h.id, h.pos.y + 1);
        }
        if (chair === undefined) throw new Error("Chair not found");
      }

      renderSortCompValue.set(h.id, h.pos.y);
    }

    for (const o of this.staticImages) {
      renderSortCompValue.set(o.id, o.pos.y);
    }

    for (const o of this.obstacles) {
      renderSortCompValue.set(o.id, o.pos.y);
    }

    for (const o of this.benches) {
      renderSortCompValue.set(o.id, o.pos.y);
    }

    for (const t of this.tables.getTables()) {
      renderSortCompValue.set(t.id, t.pos.y);
    }

    renderSortCompValue.set(this.cafe.id, this.cafe.pos.y);
    renderSortCompValue.set(this.cafe.door.id, this.cafe.door.pos.y + 1);

    this.sortObjects((s1, s2) => {
      const v1 = renderSortCompValue.get(s1.id);
      const v2 = renderSortCompValue.get(s2.id);

    
      if (v1 === undefined || v2 === undefined) {
        console.log(s1, s2);
        console.log("Render sort error");
        return 0;
      }

      return v1 - v2;
    });
  }
}
