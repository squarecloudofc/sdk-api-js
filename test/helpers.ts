import { SquareCloudAPI, type SquareCloudAPIOptions } from "../src/index.ts";

// Every test file imports this: a client built without mock() fails loudly instead
// of reaching the real API
globalThis.fetch = () => {
	throw new Error("network disabled in tests: build the client with mock()");
};

export type Call = {
	method: string;
	url: URL;
	headers: Record<string, string>;
	/** Parsed JSON body, or the raw body (FormData, ...). */
	body: unknown;
	init: RequestInit;
};

/** A client whose transport is `handler`; every request is recorded in `calls`. */
export function mock(
	handler: (call: Call, index: number) => Response | Promise<Response>,
	options: SquareCloudAPIOptions = {},
) {
	const calls: Call[] = [];
	const fetch = async (
		input: string | URL | Request,
		init: RequestInit = {},
	) => {
		const call: Call = {
			method: init.method ?? "GET",
			url: new URL(String(input)),
			headers: (init.headers ?? {}) as Record<string, string>,
			body: typeof init.body === "string" ? JSON.parse(init.body) : init.body,
			init,
		};
		calls.push(call);
		return handler(call, calls.length - 1);
	};
	const api = new SquareCloudAPI("key", { maxRetries: 2, ...options, fetch });
	return { api, calls };
}

export const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});

export const ok = (response?: unknown) =>
	json(200, { status: "success", response });

/**
 * A streamed body delivered in the given chunks (strings are UTF-8 encoded).
 * With `fail`, the stream errors after the last chunk is read, like a dropped socket.
 */
export const chunked = (chunks: (string | Uint8Array)[], fail?: Error) =>
	new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(
					typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk,
				);
			}
		},
		// Only called once the queue is drained
		pull(controller) {
			if (fail) controller.error(fail);
			else controller.close();
		},
	});
