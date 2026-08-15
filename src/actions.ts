import {
  type SkateActionSpec,
  ActionConstructors as SkateConstructors,
} from "./skate-park/SkatePark";
import {
  type FikaActionSpec,
  ActionConstructors as FikaConstructors,
} from "./cafe/Fika";

import {
  type CommonActionSpec,
  ActionConstructors as CommonConstructors,
} from "./commonActions";
import {
  type PlayBallActionSpec,
  ActionConstructors as PlayBallActionConstructors,
} from "./ball/PlayBall";
import {
  type StrollActionSpec,
  ActionConstructors as StrollActionConstructors,
} from "./stroller/Stroll";
import {
  type DuckWalkActionSpec,
  ActionConstructors as DuckWalkActionConstructors,
} from "./ducks/DuckWalk";

export type ActionSpec = FikaActionSpec &
  SkateActionSpec &
  CommonActionSpec &
  PlayBallActionSpec &
  StrollActionSpec & DuckWalkActionSpec;

export type ActionTag = keyof ActionSpec;

export interface Updatable {
  readonly tag: ActionTag;
  init(): void;
  update(dt: number): void;
  isComplete(): boolean;
 
}

type Ctor<A extends unknown[], R> = new (...args: A) => R;

type Registry = {
  [K in ActionTag]: Ctor<ActionSpec[K]["args"], ActionSpec[K]["result"]>;
};

let registry: Registry | null = null;

function getRegistry(): Registry {
  if (!registry) {
    registry = {
      ...SkateConstructors,
      ...FikaConstructors,
      ...CommonConstructors,
      ...PlayBallActionConstructors,
      ...StrollActionConstructors,
      ...DuckWalkActionConstructors
    } as Registry;
  }
  return registry;
}

export function createAction<A extends ActionTag>(
  tag: A,
  ...args: ActionSpec[A]["args"]
): ActionSpec[A]["result"] {
  const C = getRegistry()[tag] as Ctor<
    ActionSpec[A]["args"],
    ActionSpec[A]["result"]
  >;
  return new C(...args);
}
