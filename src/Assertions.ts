import { SquareCloudAPIError } from './APIManager';
import { ReadStream } from 'fs';
import z from 'zod';

export function validateString(
  value: any,
  code?: string,
  starts: string = ''
): asserts value is string {
  if (starts) validateString(starts);

  handleParser(
    () => z.string().parse(value),
    'Expect string, got ' + typeof value,
    code
  );
}

export function validateBoolean(
  value: any,
  code?: string
): asserts value is boolean {
  handleParser(
    () => z.boolean().parse(value),
    'Expect boolean, got ' + typeof value,
    code
  );
}

export function validateCommitLike(
  value: any,
  code?: string
): asserts value is string | ReadStream | Buffer {
  handleParser(
    () =>
      z
        .string()
        .or(
          z
            .custom((value) => value instanceof ReadStream)
            .or(z.custom((value) => value instanceof Buffer))
        )
        .parse(value),
    'Expect string, ReadStream or Buffer, got ' + typeof value,
    code
  );
}

function handleParser(func: any, message: string, code?: string) {
  try {
    func();
  } catch {
    throw new SquareCloudAPIError(
      code ? `INVALID_${code}` : 'VALIDATION_ERROR',
      message
    );
  }
}
