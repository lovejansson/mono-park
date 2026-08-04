import { randomEl, Sprite, type Direction, type Vec2 } from "../lib";
import { easeOut, euclidean, isSamePos, roundToDecimal } from "../lib/utils";
import type Play from "../Play";

export type PlayerArea = {
  direction: Direction;
  positions: Vec2[];
};

export default class BallGame {
  private play: Play;
  private players: number[];
  private playerWithBall: number | null;
  private passTo: number | null;
  private ball: Ball;
  private playerAreas: (PlayerArea & { player: number | null })[];
  private passTargetPosByPlayer: Map<number, Vec2>;

  constructor(
    play: Play,
    ball: Ball,
    startPlayer: number,
    players: number[],
    playerAreas: PlayerArea[],
  ) {
    this.playerWithBall = startPlayer;
    this.passTo = null;
    this.ball = ball;
    this.play = play;
    this.players = players;
    this.playerAreas = playerAreas.map((pa) => ({ ...pa, player: null }));
    this.passTargetPosByPlayer = new Map();
  }

  enter(id: number): void {
    const player = this.players.find((p) => p === id);

    if (player !== undefined) throw new Error("Player already in game");

    const playerArea = this.playerAreas.find((pa) => pa.player === null);

    if (playerArea === undefined) throw new Error("Game is full");

    this.players.push(id);

    playerArea.player = id;
  }

  quit(id: number): void {
    const idx = this.players.findIndex((p) => p === id);

    if (idx === -1) throw new Error("No player found.");

    const playerArea = this.playerAreas.find((pa) => pa.player === null);

    if (playerArea === undefined) throw new Error("Player not in game");

    this.players.splice(idx, 1);
    playerArea.player = null;
  }

  isPlaying(id: number): boolean {
    return this.players.find((p) => p === id) !== undefined;
  }

  numberOfPlayers(): number {
    return this.players.length;
  }

  getRandomPlayer(me: number): number {
    let player = me;

    while (player === me) {
      const p = randomEl(this.players);
      if (p === null) throw new Error("No player found.");
      player = p;
    }

    return player;
  }

  getPlayerArea(id: number): PlayerArea {
    const playerIdx = this.players.findIndex((p) => p === id);

    if (playerIdx === -1) throw new Error("No player found.");

    const playerArea = this.playerAreas.find((pa) => pa.player === null);

    if (playerArea === undefined) throw new Error("Player not in game");

    return { direction: playerArea.direction, positions: playerArea.positions };
  }

  getBallPos(): Vec2 {
    return this.ball.pos;
  }

  hasGotBall(id: number) {
    return id === this.playerWithBall;
  }

  getPassTargetPos(id: number): Vec2 | null {
    const pos = this.passTargetPosByPlayer.get(id);
    return pos ? { ...pos } : null;
  }

  pass(to: number) {
    const playerArea = this.getPlayerArea(to);
    const facing = playerArea.direction;

    let areaPos = randomEl(playerArea.positions)!;
    let pos = { ...areaPos };

    const tileSize = this.play.tileSize;

    switch (facing) {
      case "n":
        pos = { x: areaPos.x, y: areaPos.y - tileSize / 2 };
        break;
      case "e":
        pos = { x: areaPos.x + tileSize / 2, y: areaPos.y };
        break;
      case "s":
        pos = { x: areaPos.x, y: areaPos.y + tileSize / 2 };
        break;
      case "w":
        pos = { x: areaPos.x - tileSize / 2, y: areaPos.y };
        break;
      default:
        throw new Error("Invalid player area direction");
    }

    this.passTargetPosByPlayer.set(to, { ...areaPos });
    this.passTo = to;
    this.playerWithBall = null;
    this.ball.shoot(pos);
  }

  update(_: number) {
    if (this.passTo !== null && !this.ball.isInAir()) {
      this.playerWithBall = this.passTo;
      this.passTo = null;
    }
  }
}

type IdleState = {
  isInAir: false;
};

type ShootState = {
  isInAir: true;
  to: Vec2;
  from: Vec2;
  duration: number;
  t: number;
};

type BallState = IdleState | ShootState;

export class Ball extends Sprite {
  private state: BallState;

  constructor(scene: Play, pos: Vec2) {
    super(scene, pos, 16, 16, "s");
    this.state = {
      isInAir: false,
    };
    this.animations.registerSpritesheet("ball");
  }

  init(): void {
    this.animations.onFrameChange = (_: string) => {
      if (this.state.isInAir) {
        const posChange = roundToDecimal(
          easeOut(this.state.t / this.state.duration, 2),
          2,
        );
        // easeOut(this.state.t / this.state.duration, 2);

        const arcOffset =
          (Math.sin(posChange * Math.PI) * this.scene.art!.tileSize) / 2;

        this.pos.x = Math.round(
          this.state.from.x + posChange * (this.state.to.x - this.state.from.x),
        );
        this.pos.y = Math.round(
          this.state.from.y +
            posChange * (this.state.to.y - this.state.from.y) -
            arcOffset,
        );

        this.state.t++;

        if (isSamePos(this.state.to, this.pos)) {
          this.state = {
            isInAir: false,
          };
        }
      }
    };

    this.animations.play("ball");
  }

  isInAir(): boolean {
    return this.state.isInAir;
  }

  shoot(to: Vec2) {
    const length = euclidean(this.pos, to);
    this.state = {
      isInAir: true,
      from: { ...this.pos },
      to,
      duration: Math.round(length * 0.1),
      t: 0,
    };
  }

  update(_: number): void {
    const anim = this.animations.getPlaying();
    if (this.state.isInAir && anim !== "ball-spin") {
      this.animations.play("ball-spin");
    } else if (!this.state.isInAir && anim !== "ball") {
      this.animations.play("ball");
    }
  }
}
