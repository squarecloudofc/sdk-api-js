import { SquareCloudAPIError } from "../structures";

export interface AssertionProps {
	validate: (value: unknown) => boolean;
	expect: string;
	value: unknown;
	code?: string;
}

export function assert({ validate, value, expect, code }: AssertionProps) {
	try {
		validate(value);
	} catch {
		throw new SquareCloudAPIError(
			code ? `INVALID_${code}` : "VALIDATION_ERROR",
			`Expect ${expect}, got ${typeof value}`,
		);
	}
}

export function makeAssertion<T>(
	expect: string,
	validate: (value: unknown) => boolean,
) {
	return (value: unknown, code?: string): asserts value is T => {
		assert({ validate, value, expect, code });
	};
}
