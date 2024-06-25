import type { ZodSchema } from "zod";

export interface BaseAssertionProps {
	schema: ZodSchema;
	value: unknown;
	code?: string;
}

export interface LiteralAssertionProps extends BaseAssertionProps {
	expect: string;
}

export interface APIObjectAssertionProps extends BaseAssertionProps {
	code: string;
	route: string;
}
