import * as z from "zod";
import { SquareCloudAPIError } from "./structures";

const stringSchema = z.coerce.string();
const booleanSchema = z.coerce.boolean();
const pathLikeSchema = z.string().or(z.instanceof(Buffer));

export function validateString(value: unknown, code?: string, starts?: string): asserts value is string {
  if (starts) {
    validateString(starts);
  }

  handleParse(stringSchema, value, "string", code);
}

export function validateBoolean(value: unknown, code?: string): asserts value is boolean {
  handleParse(booleanSchema, value, "boolean", code);
}

export function validatePathLike(value: unknown, code?: string): asserts value is string | Buffer {
  handleParse(pathLikeSchema, value, "string or Buffer", code);
}

function handleParse(schema: z.Schema, value: unknown, expect: string, code?: string) {
  try {
    schema.parse(value);
  } catch {
    throw new SquareCloudAPIError(
      code ? `INVALID_${code}` : "VALIDATION_ERROR",
      `Expect ${expect}, got ${typeof value}`,
    );
  }
}
