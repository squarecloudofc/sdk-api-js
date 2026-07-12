export class SquareCloudAPIError extends TypeError {
  /**
   * The raw API error code (e.g. `FILE_NOT_FOUND`, `RATE_LIMIT_EXCEEDED`).
   * Canonical values are listed in the `APIErrorCode` constant.
   */
  public readonly code: string;

  constructor(
    code: string,
    message?: string,
    options?: { stack?: string; cause?: unknown },
  ) {
    super(code);

    this.name = "SquareCloudAPIError";
    this.code = code;

    this.message =
      (code
        ?.replaceAll("_", " ")
        .toLowerCase()
        .replace(/(^|\s)\S/g, (L) => L.toUpperCase()) || "UNKNOWN_CODE") +
      (message ? `: ${message}` : "");

    if (options?.stack) {
      this.stack = options.stack;
    }

    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}
