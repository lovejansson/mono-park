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

export type ActionSpec = FikaActionSpec & SkateActionSpec &  CommonActionSpec;
export type ActionTag = keyof ActionSpec;

export interface Updatable {
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
    } as Registry;
  }
  return registry;
}

export function createAction<K extends ActionTag>(
  tag: K,
  ...args: ActionSpec[K]["args"]
): ActionSpec[K]["result"] {
  const C = getRegistry()[tag] as Ctor<
    ActionSpec[K]["args"],
    ActionSpec[K]["result"]
  >;
  return new C(...args);
}
