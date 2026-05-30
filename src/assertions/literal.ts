import { makeAssertion } from "./common";

export const assertString = makeAssertion(
  "string",
  (value) => typeof value === "string",
);

export const assertBoolean = makeAssertion(
  "boolean",
  (value) => typeof value === "boolean",
);

export const assertNumber = makeAssertion(
  "number",
  (value) => typeof value === "number" && Number.isFinite(value),
);

export const assertPathLike = makeAssertion(
  "string or Buffer",
  (value) => typeof value === "string" || value instanceof Buffer,
);
