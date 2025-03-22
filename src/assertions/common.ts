import type { LiteralAssertionProps } from "@/types/assertions";
import { SquareCloudAPIError } from "../structures";

export function assertLiteral({
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
