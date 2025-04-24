import { makeAssertion } from "./common";

export const assertString = makeAssertion<string>(
	"string",
	(value) => typeof value === "string",
);

export const assertBoolean = makeAssertion<boolean>(
	"boolean",
	(value) => typeof value === "boolean",
);

export const assertPathLike = makeAssertion<string | Buffer>(
	"string or Buffer",
	(value) => typeof value === "string" || value instanceof Buffer,
);
