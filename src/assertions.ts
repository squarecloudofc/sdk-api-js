import z from 'zod';
import SquareCloudAPIError from './structures/error';

const stringSchema = z.coerce.string();
const booleanSchema = z.coerce.boolean();
const commitLikeSchema = z
  .string()
  .or(z.custom((value) => value instanceof Buffer));

export function validateString(
  value: any,
  code?: string,
  starts?: string
): asserts value is string {
  if (starts) {
    validateString(starts);
  }

  handleParser(stringSchema, value, 'string', code);
}

export function validateBoolean(
  value: any,
  code?: string
): asserts value is boolean {
  handleParser(booleanSchema, value, 'boolean', code);
}

export function validateCommitLike(
  value: any,
  code?: string
): asserts value is string | Buffer {
  handleParser(commitLikeSchema, value, 'string or Buffer', code);
}

function handleParser(
  schema: z.Schema,
  value: any,
  expect: string,
  code?: string
) {
  try {
    schema.parse(value);
  } catch {
    throw new SquareCloudAPIError(
      code ? `INVALID_${code}` : 'VALIDATION_ERROR',
      `Expect ${expect}, got ${typeof value}`
    );
  }
}
