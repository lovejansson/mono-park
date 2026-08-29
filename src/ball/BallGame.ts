import { randomEl, Sprite, type Direction, type Vec2 } from "../lib";
import {
  easeOut,
  euclidean,
  isSamePos,
  manhattan,
  posToTile,
  roundToDecimal,
} from "../lib/utils";
import type Play from "../Play";

export type PlayerArea = {
  direction: Direction;
  positions: Vec2[];
};

const BALL_PLAYER_DIFF = 10;

export default class BallGame {
  private play: Play;
  private players: number[];
  private playerWithBall: number | null;
  private passTo: number | null;
  private ball: Ball;
  private playerAreas: (PlayerArea & { player: number | null })[];
  private passTargetPosByPlayer: Map<number, Vec2>;
  private chillinPositions: Vec2[];
  private playerInExchange: number | null;

  constructor(
    play: Play,
    ball: Ball,
    playerAreas: PlayerArea[],
    chillinPositions: Vec2[],
  ) {
    this.playerWithBall = null;
    this.passTo = null;
    this.ball = ball;
    this.play = play;
    this.players = [];
    this.playerAreas = playerAreas.map((pa) => ({ ...pa, player: null }));
    this.passTargetPosByPlayer = new Map();
    this.chillinPositions = chillinPositions;
    this.playerInExchange = null;
  }

  getPlayerPositions(): Vec2[] {
    return this.playerAreas.flatMap((a) => a.positions);
  }

  getOtherPlayerPositions(id: number): Vec2[] {
    return this.playerAreas
      .filter((a) => a.player !== id)
      .flatMap((a) => a.positions);
  }

  canQuit(): boolean {
    return this.players.length > 2 && this.playerInExchange === null;
  }

  canEnter(): boolean {
    return this.players.length < 4 && this.playerInExchange === null;
  }

  isPlayerInExchange(): boolean {
    return this.playerInExchange !== null;
  }

  playerHasExchanged(id: number): void {
    if (this.playerInExchange !== id)
      throw new Error(
        `Player ${id} is not in exchange. State: ${this.playerInExchange}`,
      );
    this.playerInExchange = null;
  }

  setPlayerInExchange(id: number): void {
    if (this.playerInExchange !== null)
      throw new Error(`Player is already in exchange ${this.playerInExchange}`);
    this.playerInExchange = id;
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

    const playerArea = this.playerAreas.find((pa) => pa.player === id);

    if (playerArea === undefined) throw new Error("Player not in game");

    this.players.splice(idx, 1);
    playerArea.player = null;
  }

  hasChillPos(): boolean {
    return (
      this.chillinPositions.find(
        (p) => !this.play.grid.isTileOccupied(posToTile(p, this.play.tileSize)),
      ) !== undefined
    );
  }

  getChillPos(id: number): Vec2 {

    // Pick the closest chill pos to the player 
    
    const player = this.play.getBaller(id);

    let min = Infinity;
    let pos: Vec2 | null = null;

    for (const p of this.chillinPositions) {
      if (this.play.grid.isTileOccupied(posToTile(p, this.play.tileSize))) {
        continue;
      }

      const dist = manhattan(
        posToTile(p, this.play.tileSize),
        posToTile(player.pos, this.play.tileSize),
      );

      if (dist < min) {
        min = dist;
        pos = p;
      }
    }

    if (pos === null) throw new Error("No chill pos left!");

    return pos;
  }

  isPlaying(id: number): boolean {
    return this.players.find((p) => p === id) !== undefined;
  }

  getPlayerToPassTo(me: number): number {
    let player = me;

    // Pick another player that is not walking right now
    while (player === me) {
      const pID = randomEl(this.players);

      if (pID === null) throw new Error("No player found.");

      const playerObj = this.play.getBaller(pID);

      // Only pick players that are in their player areas to not pass to someone who hasn't arrived to the game yet

      const playerArea = this.getPlayerArea(pID);

      const playerIsStandingAtAreaPos = playerArea.positions.find((p) =>
        isSamePos(playerObj.pos, p),
      );

      if (!playerIsStandingAtAreaPos) continue;

      player = pID;
    }

    return player;
  }

  getPlayerArea(id: number): PlayerArea {
    const playerIdx = this.players.findIndex((p) => p === id);

    if (playerIdx === -1) throw new Error("No player found.");

    const playerArea = this.playerAreas.find((pa) => pa.player === id);

    if (playerArea === undefined) throw new Error("Player not in game");

    return { direction: playerArea.direction, positions: playerArea.positions };
  }

  getBallPos(): Vec2 {
    return this.ball.pos;
  }

  hasGotBall(id: number) {
    return id === this.playerWithBall;
  }

  setPlayerWithBall(id: number): void {

    this.playerWithBall = id;
    const player = this.play.getBaller(id);
    const playerArea = this.playerAreas.find(
      (a) => a.player === this.playerWithBall,
    );

    if (playerArea === undefined)
      throw new Error(`Player area for player ${id} not found`);

    // Position the ball in front of the player
    switch (playerArea.direction) {
      case "n":
        this.ball.pos = { x: player.pos.x, y: player.pos.y - BALL_PLAYER_DIFF };
        break;
      case "e":
        this.ball.pos = { x: player.pos.x + BALL_PLAYER_DIFF, y: player.pos.y };
        break;
      case "s":
        this.ball.pos = { x: player.pos.x, y: player.pos.y + BALL_PLAYER_DIFF };
        break;
      case "w":
        this.ball.pos = { x: player.pos.x - BALL_PLAYER_DIFF, y: player.pos.y };
        break;
      default:
        throw new Error("Invalid player area direction");
    }
  }

  getPassTargetPos(id: number): Vec2 {
    const pos = this.passTargetPosByPlayer.get(id);

    if (pos === undefined)
      throw new Error(`Pass target pos not found for player ${id}`);

    return pos;
  }

  pass(to: number) {
    const playerArea = this.getPlayerArea(to);
    const facing = playerArea.direction;

    let areaPos = randomEl(playerArea.positions)!;
    let pos = { ...areaPos };

    // Goal pos for ball to shoot to which is in front of the player target position
    switch (facing) {
      case "n":
        pos = { x: areaPos.x, y: areaPos.y - BALL_PLAYER_DIFF };
        break;
      case "e":
        pos = { x: areaPos.x + BALL_PLAYER_DIFF, y: areaPos.y };
        break;
      case "s":
        pos = { x: areaPos.x, y: areaPos.y + BALL_PLAYER_DIFF };
        break;
      case "w":
        pos = { x: areaPos.x - BALL_PLAYER_DIFF, y: areaPos.y };
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
        // Calculate the fraction of how far the ball should have reached by now time (t) divided by total duration
        const posChange = roundToDecimal(
          easeOut(this.state.t / this.state.duration, 4),
          2,
        );

        // Calculate a slight arc offset to get the ball to curve
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
