import * as z from "zod";
import { handleLiteralAssertion } from "./common";

const stringSchema = z.coerce.string();
const booleanSchema = z.coerce.boolean();
const pathLikeSchema = z.string().or(z.instanceof(Buffer));

export function assertString(
	value: unknown,
	code?: string,
): asserts value is string {
	handleLiteralAssertion({
		schema: stringSchema,
		expect: "string",
		value,
		code,
	});
}

export function assertBoolean(
	value: unknown,
	code?: string,
): asserts value is boolean {
	handleLiteralAssertion({
		schema: booleanSchema,
		expect: "boolean",
		value,
		code,
	});
}

export function assertPathLike(
	value: unknown,
	code?: string,
): asserts value is string | Buffer {
	handleLiteralAssertion({
		schema: pathLikeSchema,
		expect: "string or Buffer",
		value,
		code,
	});
}
