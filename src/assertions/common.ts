import * as z from "zod";
import { SquareCloudAPIError } from "../structures";

const stringSchema = z.coerce.string();
const booleanSchema = z.coerce.boolean();
const pathLikeSchema = z.string().or(z.instanceof(Buffer));

export function assertString(
	value: unknown,
	code?: string,
): asserts value is string {
	handleAssertion({ schema: stringSchema, expect: "string", value, code });
}

export function assertBoolean(
	value: unknown,
	code?: string,
): asserts value is boolean {
	handleAssertion({ schema: booleanSchema, expect: "boolean", value, code });
}

export function assertPathLike(
	value: unknown,
	code?: string,
): asserts value is string | Buffer {
	handleAssertion({
		schema: pathLikeSchema,
		expect: "string or Buffer",
		value,
		code,
	});
}

export function handleAssertion({
	schema,
	value,
	expect,
	code,
}: {
	schema: z.Schema;
	value: unknown;
	expect: string;
	code?: string;
}) {
	try {
		schema.parse(value);
	} catch {
		throw new SquareCloudAPIError(
			code ? `INVALID_${code}` : "VALIDATION_ERROR",
			`Expect ${expect}, got ${typeof value}`,
		);
	}
}
