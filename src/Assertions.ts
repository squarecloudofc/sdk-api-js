import z from 'zod';

export function validateString(value: any): asserts value is string {
  z.string().parse(value);
}

export function validateBoolean(value: any): asserts value is boolean {
  z.boolean().parse(value);
}

export function validatePathLike(value: any): asserts value is string | Buffer {
  z.string()
    .or(z.custom((value) => value instanceof Buffer))
    .parse(value);
}
