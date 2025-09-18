import { SquareCloudAPIError } from "../structures";

export interface AssertionProps {
  validate: (value: unknown) => boolean;
  expect: string;
  value: unknown;
  name?: string;
}

export function assert({ validate, value, expect, name }: AssertionProps) {
  if (!validate(value)) {
    const code = name ? `INVALID_${name}` : "VALIDATION_ERROR";
    const message = `Expected ${expect}, got ${typeof value}`;

    throw new SquareCloudAPIError(code, message);
  }
}

export function makeAssertion(
  expect: string,
  validate: (value: unknown) => boolean,
) {
  return (value: unknown, name?: string) => {
    assert({ validate, value, expect, name });
  };
}
