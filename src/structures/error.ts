export class SquareCloudAPIError extends TypeError {
	constructor(
		code: string,
		message?: string,
		options?: { stack?: string; cause?: unknown },
	) {
		super(code);

		this.name = "SquareCloudAPIError";

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
