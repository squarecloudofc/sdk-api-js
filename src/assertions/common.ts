import {
	APIObjectAssertionProps,
	LiteralAssertionProps,
} from "@/types/assertions";
import * as z from "zod";
import { SquareCloudAPIError } from "../structures";

export function handleLiteralAssertion({
	schema,
	value,
	expect,
	code,
}: LiteralAssertionProps) {
	try {
		schema.parse(value);
	} catch {
		throw new SquareCloudAPIError(
			code ? `INVALID_${code}` : "VALIDATION_ERROR",
			`Expect ${expect}, got ${typeof value}`,
		);
	}
}

export function handleAPIObjectAssertion({
	schema,
	value,
	code,
	route,
}: APIObjectAssertionProps) {
	const name = code.toLowerCase().replaceAll("_", " ");

	try {
		schema.parse(value);
	} catch (err) {
		const cause = err.errors?.map((err: z.ZodIssue) => ({
			...err,
			path: err.path.join(" > "),
		}));

		throw new SquareCloudAPIError(
			`INVALID_API_${code}`,
			`Invalid ${name} object received from API ${route}`,
			{ cause },
		);
	}
}
