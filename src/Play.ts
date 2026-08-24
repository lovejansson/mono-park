import {
  ArtObject,
  Scene,
  StaticImage,
  type Direction,
  type Vec2,
} from "./lib/index.ts";
import { type Tilemap } from "./types.ts";
import { getRandomFreeCell } from "./grid.ts";
import Obstacle, { Bowl, Flat, Rail } from "./skate-park/Obstacle.ts";
import Skater from "./skate-park/Skater.ts";
import { cellToPos } from "./lib";
import Bench from "./Bench.ts";
import spikeSkaterJSON from "./assets/spritesheets/spike-skater.json";
import spikeBaseJSON from "./assets/spritesheets/spike-base.json";
import kimSkaterJSON from "./assets/spritesheets/kim-skater.json";
import kimBaseJSON from "./assets/spritesheets/kim-base.json";
import bobbySkaterJSON from "./assets/spritesheets/bobby-skater.json";
import bobbyBaseJSON from "./assets/spritesheets/bobby-base.json";
import emilSkaterJSON from "./assets/spritesheets/emil-skater.json";
import emilBaseJSON from "./assets/spritesheets/emil-base.json";
import jazzSkaterJSON from "./assets/spritesheets/jazz-skater.json";
import jazzBaseJSON from "./assets/spritesheets/jazz-base.json";
import squidSkaterJSON from "./assets/spritesheets/squid-skater.json";
import squidBaseJSON from "./assets/spritesheets/squid-base.json";
import doorCafeJSON from "./assets/spritesheets/door-cafe.json";
import drinksJSON from "./assets/spritesheets/drinks.json";

import amandaBaseJSON from "./assets/spritesheets/amanda-base.json";
import amandaBallerJSON from "./assets/spritesheets/amanda-baller.json";
import bennyBaseJSON from "./assets/spritesheets/benny-base.json";
import bennyBallerJSON from "./assets/spritesheets/benny-baller.json";
import lindaBaseJSON from "./assets/spritesheets/linda-base.json";
import lindaBallerJSON from "./assets/spritesheets/linda-baller.json";
import maxBaseJSON from "./assets/spritesheets/max-base.json";
import maxBallerJSON from "./assets/spritesheets/max-baller.json";
import nickBaseJSON from "./assets/spritesheets/nick-base.json";
import nickBallerJSON from "./assets/spritesheets/nick-baller.json";

import kitJSON from "./assets/spritesheets/kit-base.json";
import missyJSON from "./assets/spritesheets/missy-base.json";
import sashaJSON from "./assets/spritesheets/sasha-base.json";

import hawkJSON from "./assets/spritesheets/hawk-base.json";
import bowlJSON from "./assets/spritesheets/bowl-base.json";

import ballJSON from "./assets/spritesheets/ball.json";
import duckJSON from "./assets/spritesheets/duck.json";
import foodsCafeJSON from "./assets/spritesheets/foods.json";
import { type AsepriteJSON } from "./lib/index";
import { Door } from "./cafe/House.ts";
import { parseObject, type ParsedObject } from "./schemas.ts";
import Table from "./cafe/Table.ts";
import Cafe, { Tables } from "./cafe/Cafe.ts";
import Human from "./Human.ts";
import BallGame, { Ball, type PlayerArea } from "./ball/BallGame.ts";
import Group from "./Group.ts";
import Duck from "./ducks/Duck.ts";
import { getCollision } from "./lib/collision.ts";
import { GroundArea } from "./lib/Grid.ts";
import {
  BowlObstacle,
  FlatObstacle,
  RailObstacle,
  SitOnBench,
} from "./skate-park/Skate.ts";
import SkateGround from "./skate-park/SkateGround.ts";
import StrollPark from "./stroller/StrollPark.ts";
import { StrollSpot, type StrollSpotData } from "./stroller/StrollPark.ts";
import Baller from "./ball/Baller.ts";
import VendingMachine from "./VendingMachine.ts";
import Stroller from "./stroller/Stroller.ts";

export default class Play extends Scene {
  private tilemap: Tilemap;
  public tileSize: number;
  private playlist: string[];

  private skaters: Skater[];
  private ballers: Baller[];
  private strollers: Stroller[];
  private humans: Human[];
  private ducks: Duck[];

  public pondBench!: Bench; // Is set in init()

  private staticImages: StaticImage[];

  private ballGame!: BallGame;
  public cafe!: Cafe;
  public tables!: Tables; // Is set in init()

  strollPark!: StrollPark; // Is set in init()
  skateGround!: SkateGround; // Is set in init()

  constructor(tilemap: Tilemap) {
    super();
    this.tilemap = tilemap;
    this.tileSize = 16;
    this.playlist = [
      "Alligator",
      "Backed",
      "Backseat",
      "Brick by Brick",
      "Bud",
      "Corner Cypher",
      "Daydream",
      "Dennis",
      "Dude",
      "Goob",
      "Hour",
      "Jungle Beats",
      "Louisville",
      "Make it Out",
      "New Swagger",
      "New",
      "Okulus",
      "Pages",
      "Saxo",
      "Stroll",
      "Sued",
      "Times Rhymes",
      "Track Runner",
      "Vibes",
      "Villain Vibes",
      "Villainous Visions",
      "Wallo",
      "Waltz",
      "Weather",
      "Windows",
    ];
    this.skaters = [];
    this.ballers = [];
    this.ducks = [];
    this.staticImages = [];
    this.humans = [];
    this.strollers = [];
  }

  getHuman(id: number): Human {
    const human = this.humans.find((h) => h.id === id);
    if (human === undefined) throw new Error("Human not found in scene.");
    return human;
  }

  getBaller(id: number): Baller {
    const baller = this.ballers.find((h) => h.id === id);
    if (baller === undefined) throw new Error("Baller not found in scene.");
    return baller;
  }

  getBench(): Bench {
    if (!this.pondBench.isFree) throw new Error("No free bench");
    this.pondBench.isFree = false;
    return this.pondBench;
  }

  returnBench(bench: Bench): void {
    bench.isFree = true;
  }

  hasFreeBenches(): boolean {
    return this.pondBench.isFree;
  }

  async init() {
    await this.loadStaticAssets();

    this.art.audio.add("ambience", "/sound/ambience.mp3");

    for (const t of this.playlist) {
      this.art.audio.add(t, `/sound/playlist/${t}.webm`);
    }

    await this.art.audio.load();

    const obstacles: Obstacle[] = [];
    const skateGroundBenches: Bench[] = [];
    const strollSpots: StrollSpotData[] = [];
    const vendingMachines: VendingMachine[] = [];

    const flat = new Flat(
      this,
      { x: 36 * this.tileSize, y: 8 * this.tileSize },
      this.art!.tileSize,
      this.art!.tileSize,
    );

    obstacles.push(flat);
    this.addObject(flat);

    this.grid.init(this.tilemap.rows, this.tilemap.cols);

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

    const playerAreas: PlayerArea[] = [];
    const ballerChillPositions: Vec2[] = [];

    for (const t of this.tilemap.attributes) {
      const isSkateGround = t.attributes.isSkateGround === true;
      const isWalkable = t.attributes.isWalkable === true;
      const isBallerArea = t.attributes.isBallerArea === true;
      const isBallerChillPos = t.attributes.isBallerChillPos === true;
      const isGrassByThePond = t.attributes.isGrassByThePond === true;
      const isCactusSpot = t.attributes.isCactusSpot === true;
      const isSkateSpot = t.attributes.isSkateSpot === true;
      const isPond = t.attributes.isPond === true;
      const isBridgeSpot = t.attributes.isBridgeSpot === true;

      if (isWalkable) {
        this.grid.setTileValue(
          t.pos.y / this.tileSize,
          t.pos.x / this.tileSize,
          GroundArea.GRASS,
        );
      }

      if (isPond) {
        this.grid.setTileValue(
          t.pos.y / this.tileSize,
          t.pos.x / this.tileSize,
          GroundArea.POND,
        );
      }

      if (isGrassByThePond && t.attributes.spotDirection) {
        this.pushSpot(
          StrollSpot.GRASS_BY_THE_POND,
          t.pos,
          t.attributes.spotDirection as Direction,
          strollSpots,
        );
      }

      if (isCactusSpot) {
        this.pushSpot(StrollSpot.CACTUSES, t.pos, "n", strollSpots);
      }

      if (isSkateSpot) {
        this.pushSpot(StrollSpot.SKATE_GROUND, t.pos, "e", strollSpots);
      }

      if (isBridgeSpot && t.attributes.spotDirection) {
        this.pushSpot(
          StrollSpot.BRIDGE,
          t.pos,
          t.attributes.spotDirection as Direction,
          strollSpots,
        );
      }

      if (isBallerChillPos) {
        ballerChillPositions.push(t.pos);
      }

      if (isSkateGround) {
        this.grid.setTileValue(
          t.pos.y / this.tileSize,
          t.pos.x / this.tileSize,
          GroundArea.SKATE_GROUND,
        );
      }

      if (isBallerArea) {
        const direction = t.attributes.ballerDirection;

        if (direction === undefined)
          throw new Error("No direction for player area");

        const playerArea = playerAreas.find((a) => a.direction === direction);

        if (playerArea) {
          playerArea.positions.push({ x: t.pos.x, y: t.pos.y });
        } else {
          playerAreas.push({
            direction: direction as Direction,
            positions: [{ x: t.pos.x, y: t.pos.y }],
          });
        }
      }
    }

    for (const o of this.tilemap.objects) {
      const parsedObj = parseObject(o);
      this.art!.images.add(parsedObj.name, o.image);
      this.processObject(
        parsedObj,
        obstacles,
        skateGroundBenches,
        strollSpots,
        vendingMachines,
      );
    }

    this.grid.setTileValue(5, 2, GroundArea.NOT_WALKABLE); // QUICK FIX FOR SOME POND GRASS so that the ducks are not drawn on top of it...

    console.dir(this.grid.getGrid());

    this.tables = new Tables(this.objects.filter((o) => o instanceof Table));

    this.skateGround = new SkateGround(
      this,
      obstacles,
      skateGroundBenches,
      vendingMachines,
    );

    this.strollPark = new StrollPark(this, strollSpots);

    await this.art!.images.load();

    this.initDucks();

    this.initSkaters();

    this.initBallers(playerAreas, ballerChillPositions);

    this.initStrollers();
  }

  start() {
    if (this.art.isPlaying) {
      this.art.audio.play("ambience", 1, true);
      this.art.audio.playlist(this.playlist, 0.25, true);
    }
  }

  update(dt: number) {
    super.update(dt);

    this.ballGame.update(dt);

    // Sort objects

    const renderSortCompValue = new Map<number, number>();

    const ballHolder = this.humans.find((h) => this.ballGame.hasGotBall(h.id));
    const ballHolderAnim = ballHolder?.animations.getPlaying() ?? null;
    const shouldUseHolderBallSort =
      ballHolder !== undefined &&
      ballHolderAnim !== null &&
      (ballHolderAnim.startsWith("idle-stand-") ||
        ballHolderAnim.startsWith("shoot-"));

    for (const o of this.objects) {
      if (
        o instanceof Ball &&
        ballHolder !== undefined &&
        shouldUseHolderBallSort
      ) {
        renderSortCompValue.set(
          o.id,
          ballHolder.direction === "n"
            ? ballHolder.pos.y - 1
            : ballHolder.pos.y + 1,
        );
        continue;
      }

      renderSortCompValue.set(o.id, o.pos.y);
    }

    for (const s of this.skaters) {
      const obstacle = this.skateGround
        .getObstacles()
        .find((o2) => o2.id === s.obstacle);

      if (obstacle !== undefined) {
        if (obstacle.type === "bowl") {
          renderSortCompValue.set(s.id, obstacle.pos.y + 1);
          continue;
        }
      }

      if (this.pondBench.id === s.bench) {
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

        continue;
      }

      renderSortCompValue.set(h.id, h.pos.y);
    }

    for (const o of this.staticImages) {
      renderSortCompValue.set(o.id, o.pos.y);
    }

    for (const o of this.skateGround.getObstacles()) {
      renderSortCompValue.set(o.id, o.pos.y);
    }

    renderSortCompValue.set(this.pondBench.id, this.pondBench.pos.y);

    for (const t of this.tables.getTables()) {
      renderSortCompValue.set(t.id, t.pos.y);
    }

    const bridge = this.staticImages.find((si) => si.image === "bridge");
    const bridgeTop = this.staticImages.find((si) => si.image === "bridge-top");
    if (bridgeTop === undefined) throw new Error("Bridge top object not found");
    if (bridge === undefined) throw new Error("Bridge object not found");

    let isColliding = false;
    for (const d of this.ducks) {
      // Render the ducks before bridge/tree to get them behind
      const collisionBridge = getCollision(d, bridge!);

      if (collisionBridge) {
        renderSortCompValue.set(d.id, bridge!.pos.y - 1);
        isColliding = true;
      }

      for (const t of this.staticImages.filter((i) => i.image === "tree")) {
        const c = getCollision(d, t);

        if (c) {
          renderSortCompValue.set(d.id, t.pos.y - 1);
          isColliding = true;
          break;
        }
      }

      if (!isColliding) renderSortCompValue.set(d.id, d.pos.y);
    }

    for (const s of this.strollers) {
      const c = getCollision(s, bridgeTop);

      if (c) {
        renderSortCompValue.set(s.id, bridgeTop.pos.y - 1);

        continue;
      }

      renderSortCompValue.set(s.id, s.pos.y);
    }

    for (const b of this.ballers) {
      for (const t of this.staticImages.filter((i) => i.image === "tree")) {
        const c = getCollision(b, t);

        if (c) {
          renderSortCompValue.set(b.id, t.pos.y - 1);
          isColliding = true;
          break;
        }
      }

      if (!isColliding) renderSortCompValue.set(b.id, b.pos.y);
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

  private pushSkater(skater: Skater) {
    const cell = getRandomFreeCell(this.grid.getGrid(), [
      GroundArea.SKATE_GROUND,
    ]);
    if (cell === null) return;

    skater.pos = cellToPos(cell, this.tileSize);
    skater.init();
    this.skaters.push(skater);
    this.addObject(skater);
  }

  initSkaters(): void {
    const skaters = new Group(this, "skaters", []);

    skaters.init();

    this.pushSkater(
      new Skater(this, { x: 0, y: 0 }, "jazz", 10, SitOnBench.TAG, skaters),
    );

    this.pushSkater(
      new Skater(this, { x: 0, y: 0 }, "bobby", 10, BowlObstacle.TAG, skaters),
    );

    this.pushSkater(
      new Skater(this, { x: 0, y: 0 }, "emil", 10, RailObstacle.TAG, skaters),
    );

    this.pushSkater(
      new Skater(this, { x: 0, y: 0 }, "spike", 10, RailObstacle.TAG, skaters),
    );

    this.pushSkater(
      new Skater(this, { x: 0, y: 0 }, "kim", 10, FlatObstacle.TAG, skaters),
    );

    this.pushSkater(
      new Skater(this, { x: 0, y: 0 }, "squid", 4, FlatObstacle.TAG, skaters),
    );
  }

  initStrollers(): void {
    const grls = new Group(this, "grls", [
      StrollSpot.GRASS_BY_THE_POND,
      StrollSpot.BRIDGE,
      StrollSpot.SKATE_GROUND,
      StrollSpot.CACTUSES,
    ]);

    grls.init();

    this.pushStroller(
      new Stroller(
        this,
        {
          x: 9 * this.tileSize,
          y: this.tileSize * 11,
        },
        "missy",
        "stroll",
        grls,
      ),
    );

    this.pushStroller(
      new Stroller(
        this,
        {
          x: this.tileSize * 10,
          y: this.tileSize * 10,
        },
        "kit",
        "stroll",
        grls,
      ),
    );

    this.pushStroller(
      new Stroller(
        this,
        {
          x: this.tileSize * 8,
          y: this.tileSize * 10,
        },
        "sasha",
        "stroll",
        grls,
      ),
    );

    const couple = new Group(this, "the-couple", [
      StrollSpot.POND_BENCH,
      StrollSpot.CACTUSES,
      StrollSpot.SKATE_GROUND,
      StrollSpot.POND_BENCH,
    ]);

    couple.init();

    this.pushStroller(
      new Stroller(
        this,
        {
          x: this.tileSize * 9,
          y: this.tileSize * 4,
        },
        "hawk",
        "stroll",
        couple,
      ),
    );

    this.pushStroller(
      new Stroller(
        this,
        {
          x: this.tileSize * 8,
          y: this.tileSize * 4,
        },
        "bowl",
        "stroll",
        couple,
      ),
    );
  }

  private pushStroller(stroller: Stroller): void {
    this.strollers.push(stroller);
    this.addObject(stroller);
    stroller.init();
  }

  private pushBaller(baller: Baller): void {
    this.ballers.push(baller);
    this.addObject(baller);
    baller.init();
  }

  private initBallers(playerAreas: PlayerArea[], chillPositions: Vec2[]): void {
    const ball = new Ball(this, {
      x: 0,
      y: 0,
    });

    ball.init();

    this.addObject(ball);

    this.ballGame = new BallGame(this, ball, playerAreas, chillPositions);

    const ballers = new Group(this, "ballers", []);

    ballers.init();

    this.pushBaller(
      new Baller(
        this,
        {
          x: 0,
          y: 0,
        },
        "linda",
        this.ballGame,
        ballers,
      ),
    );

    this.pushBaller(
      new Baller(
        this,
        {
          x: 0,
          y: 0,
        },
        "benny",
        this.ballGame,
        ballers,
      ),
    );

    this.pushBaller(
      new Baller(
        this,
        {
          x: 0,
          y: 0,
        },
        "amanda",
        this.ballGame,
        ballers,
        true,
      ),
    );

    this.pushBaller(
      new Baller(
        this,
        {
          x: 0,
          y: 0,
        },
        "max",
        this.ballGame,
        ballers,
      ),
    );

    this.pushBaller(
      new Baller(
        this,
        {
          x: 0,
          y: 0,
        },
        "nick",
        this.ballGame,
        ballers,
      ),
    );
  }

  private initDucks() {
    const getInitDuckPos = (id: number) => {
      while (true) {
        const tile = this.grid.getRandomFreeCell([GroundArea.POND]);

        if (tile !== null && tile.row > 6) {
          const pos = cellToPos(tile, this.art.tileSize);
          this.grid.occupyTile(id, pos);
          return pos;
        }
      }
    };

    for (let n = 0; n < 10; ++n) {
      const duck = new Duck(this, { x: 0, y: 0 });

      const pos = getInitDuckPos(duck.id);

      duck.pos = pos;

      duck.init();

      this.addObject(duck);
      this.ducks.push(duck);
    }
  }

  private pushSpot(
    spot: StrollSpot,
    pos: Vec2,
    direction: Direction,
    spots: StrollSpotData[],
  ) {
    const s = spots.find((s) => s.spot === spot);
    if (s) {
      s.positions.push({ pos, direction });
    } else {
      spots.push({
        spot,
        positions: [{ pos, direction }],
      });
    }
  }

  private processObject(
    o: ParsedObject,
    obstacles: Obstacle[],
    skateGroundBenches: Bench[],
    strollSpots: StrollSpotData[],
    vendingMachines: VendingMachine[],
  ): ArtObject {
    // Mark out grid areas as not walkable for object TODO: needs something

    // make objects unwalkable...
    const startRow = o.pos.y / this.tileSize;
    const startCol = o.pos.x / this.tileSize;
    const endRow = startRow + o.height / this.tileSize;
    const endCol = startCol + o.width / this.tileSize;

    // First mark obstacle as trick ground, fill it in with non walkable below
    if (o.objectType === "bowl") {
      const middleRow = startRow + o.height / 2 / this.tileSize;
      const middleCol = startCol + o.width / 2 / this.tileSize;

      this.grid.setTileValue(startRow - 1, middleCol, GroundArea.TRICK_GROUND);
      this.grid.setTileValue(endRow, middleCol, GroundArea.TRICK_GROUND);
      this.grid.setTileValue(middleRow, startCol - 1, GroundArea.TRICK_GROUND);
      this.grid.setTileValue(middleRow, endCol, GroundArea.TRICK_GROUND);

      this.grid.setTileValue(
        startRow - 1,
        middleCol - 1,
        GroundArea.TRICK_GROUND,
      );
      this.grid.setTileValue(endRow, middleCol - 1, GroundArea.TRICK_GROUND);
      this.grid.setTileValue(
        middleRow - 1,
        startCol - 1,
        GroundArea.TRICK_GROUND,
      );
      this.grid.setTileValue(middleRow - 1, endCol, GroundArea.TRICK_GROUND);
    }

    if (o.objectType === "rail") {
      for (let c = startCol - 3; c < endCol + 3; ++c) {
        this.grid.setTileValue(startRow, c, GroundArea.TRICK_GROUND);
      }
    }

    if (o.name === "tree") {
      for (let r = startRow + 2; r < endRow; ++r) {
        for (let c = startCol; c < endCol; ++c) {
          this.grid.setTileValue(r, c, GroundArea.NOT_WALKABLE);
        }
      }
    } else if (o.name === "palm") {
      for (let r = startRow + 1; r < endRow; ++r) {
        for (let c = startCol; c < endCol; ++c) {
          this.grid.setTileValue(r, c, GroundArea.NOT_WALKABLE);
        }
      }
    } else if (o.name === "bridge") {
      for (let c = startCol + 2; c < endCol - 2; ++c) {
        this.grid.setTileValue(startRow + 1, c, GroundArea.BRIDGE);
      }
      for (let c = startCol + 1; c < endCol - 1; ++c) {
        this.grid.setTileValue(startRow + 2, c, GroundArea.BRIDGE);
      }
    } else if (o.name === "bridge-top") {
      // for (let c = startCol + 2; c < endCol - 2; ++c) {
      //   this.grid.setTileValue(startRow + 1, c, GroundArea.BRIDGE);
      // }
      // for (let c = startCol + 1; c < endCol - 1; ++c) {
      //   this.grid.setTileValue(startRow + 2, c, GroundArea.BRIDGE);
      // }
    } else if (o.name === "cafe") {
      for (let r = startRow + 1; r < endRow; ++r) {
        for (let c = startCol; c < endCol; ++c) {
          this.grid.setTileValue(r, c, GroundArea.NOT_WALKABLE);
        }
      }
    } else {
      for (let r = startRow; r < endRow; ++r) {
        for (let c = startCol; c < endCol; ++c) {
          this.grid.setTileValue(r, c, GroundArea.NOT_WALKABLE);
        }
      }
    }

    // Create object instances and push to arrays
    switch (o.objectType) {
      case "bench":
        const bench = new Bench(
          this,
          o.pos,
          o.width,
          o.height,
          o.data.isAtSkateGround,
        );

        this.addObject(bench);

        if (bench.isAtSkateGround) {
          skateGroundBenches.push(bench);
        } else {
          this.pondBench = bench;
          this.pushSpot(
            StrollSpot.POND_BENCH,
            { x: bench.pos.x + this.tileSize, y: bench.pos.y + bench.height },
            "s",
            strollSpots,
          );
          this.pushSpot(
            StrollSpot.POND_BENCH,
            { x: bench.pos.x, y: bench.pos.y + bench.height },
            "s",
            strollSpots,
          );
        }
        return bench;
      case "bowl":
        const bowl = new Bowl(this, o.pos, o.width, o.height);
        obstacles.push(bowl);
        this.addObject(bowl);
        return bowl;
      case "rail":
        const rail = new Rail(this, o.pos, o.width, o.height);
        obstacles.push(rail);
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
        const vendingMachine = new VendingMachine(
          this,
          o.pos,
          o.width,
          o.height,
        );
        vendingMachines.push(vendingMachine);
        this.addObject(vendingMachine);
        return vendingMachine;
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

  private loadBallerSprite(
    name: string,
    ballerJSON: AsepriteJSON,
    baseJson: AsepriteJSON,
  ) {
    const ballerKey = `${name}-baller`;
    const baseKey = `${name}-base`;

    this.loadSprite(ballerKey, ballerJSON);
    this.loadSprite(baseKey, baseJson);
  }

  private async loadStaticAssets() {
    this.art!.images.add("tilemap", this.tilemap.tilemap);

    this.loadSprite("drinks", drinksJSON as AsepriteJSON);

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
      "emil",
      emilSkaterJSON as AsepriteJSON,
      emilBaseJSON as AsepriteJSON,
    );

    this.loadSkaterSprite(
      "jazz",
      jazzSkaterJSON as AsepriteJSON,
      jazzBaseJSON as AsepriteJSON,
    );

    this.loadSkaterSprite(
      "squid",
      squidSkaterJSON as AsepriteJSON,
      squidBaseJSON as AsepriteJSON,
    );

    this.loadSprite("door-cafe", doorCafeJSON as AsepriteJSON);
    this.loadSprite("foods", foodsCafeJSON as AsepriteJSON);
    this.loadSprite("ball", ballJSON as AsepriteJSON);
    this.loadSprite("duck", duckJSON as AsepriteJSON);

    this.loadBallerSprite(
      "linda",
      lindaBallerJSON as AsepriteJSON,
      lindaBaseJSON as AsepriteJSON,
    );
    this.loadBallerSprite(
      "benny",
      bennyBallerJSON as AsepriteJSON,
      bennyBaseJSON as AsepriteJSON,
    );
    this.loadBallerSprite(
      "max",
      maxBallerJSON as AsepriteJSON,
      maxBaseJSON as AsepriteJSON,
    );
    this.loadBallerSprite(
      "amanda",
      amandaBallerJSON as AsepriteJSON,
      amandaBaseJSON as AsepriteJSON,
    );
    this.loadBallerSprite(
      "nick",
      nickBallerJSON as AsepriteJSON,
      nickBaseJSON as AsepriteJSON,
    );

    this.loadSprite("missy-base", missyJSON as AsepriteJSON);
    this.loadSprite("sasha-base", sashaJSON as AsepriteJSON);
    this.loadSprite("kit-base", kitJSON as AsepriteJSON);

    this.loadSprite("hawk-base", hawkJSON as AsepriteJSON);
    this.loadSprite("bowl-base", bowlJSON as AsepriteJSON);
    // This is a transparent image for a "flat" obstacle... just bc static images require an image

    this.art!.images.add(
      "flat",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAEklEQVR4nGNgGAWjYBSMglEwCjAAAGwAAWzQqWQAAAAASUVORK5CYII=",
    );

    await this.art!.images.load();
  }

  private loadSprite(name: string, json: AsepriteJSON) {
    this.art!.images.add(name, `/sprites/${name}.png`);
    this.art!.spritesheets.create(name, name, json);
  }
}
