import type { Parameters } from "../fixtures/rpa.steps";

export type Env = Parameters["env"];

export type RPAPayload = {
  command: string;
  parameters?: any;
  notifyOnStartedVariant?: string;
  notifyOnSuccess?: boolean;
  notifyOnFailureLink?: string;
};
