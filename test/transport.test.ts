import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
	type App,
	type AppCreated,
	type AppSummary,
	BASE_URL,
	type DeployEvent,
	type FileEntry,
	type NetworkPerformance,
	type Percentiles,
	SquareCloudAPI,
	SquareCloudAPIError,
	type Workspace,
} from "../src/index.ts";
import { chunked, json, mock, ok } from "./helpers.ts";

const isError = (fields: Partial<SquareCloudAPIError>) => (error: unknown) => {
	assert.ok(error instanceof SquareCloudAPIError);
	assert.ok(!(error instanceof TypeError));
	for (const [key, value] of Object.entries(fields)) {
		assert.deepEqual(error[key as keyof SquareCloudAPIError], value, key);
	}
	return true;
};

describe("requests", () => {
	test("unwraps `response`, sends auth, UA and JSON headers", async () => {
		const { api, calls } = mock(() => ok({ logs: "hi" }));
		assert.equal(await api.apps.logs("a1"), "hi");
		const [{ url, headers, init }] = calls;
		assert.equal(url.href, "https://api.squarecloud.app/v2/apps/a1/logs");
		assert.equal(headers.Authorization, "key");
		assert.match(headers["User-Agent"], /^squarecloud-sdk-js\//);
		assert.equal(headers.Accept, "application/json");
		assert.equal(headers["Content-Type"], undefined);
		assert.ok(init.signal, "JSON calls carry a timeout signal");
	});

	test("JSON bodies, DELETE bodies and void mutations", async () => {
		const { api, calls } = mock(() => json(200, { status: "success" }));
		assert.equal(await api.apps.files.delete("a1", "/x.txt"), undefined);
		assert.equal(calls[0].method, "DELETE");
		assert.deepEqual(calls[0].body, { path: "/x.txt" });
		assert.equal(calls[0].headers["Content-Type"], "application/json");
	});

	test("escapes path segments; keeps <appId>-<workspaceId> intact", async () => {
		const { api, calls } = mock(() => ok({}));
		await api.apps.get("a/b?c#d");
		await api.apps.get("0123abcd-ffee0011");
		assert.equal(calls[0].url.pathname, "/v2/apps/a%2Fb%3Fc%23d");
		assert.equal(calls[0].url.search, "");
		assert.equal(calls[1].url.pathname, "/v2/apps/0123abcd-ffee0011");
	});

	test('query: drops undefined, "" and false; true as "true", dates as ISO', async () => {
		const { api, calls } = mock(() => ok({}));
		await api.apps.status("a1");
		await api.apps.status("a1", { raw: true });
		const start = new Date("2026-09-01T00:00:00Z");
		await api.apps.network.errors("a1", start, "2026-09-02T00:00:00Z", {
			include_4xx: true,
		});
		await api.apps.files.list("a1");
		await api.apps.status("a1", { raw: false });
		await api.apps.network.errors("a1", start, "b", { include_4xx: false });
		await api.apps.network.analytics("a1", start, "b", { ip: "", path: "/x" });
		await api.apps.files.list("a1", "");
		await api.apps.statusAll({ workspaceId: "" });
		assert.equal(calls[0].url.search, "");
		assert.equal(calls[1].url.searchParams.get("rawData"), "true");
		assert.deepEqual(Object.fromEntries(calls[2].url.searchParams), {
			start: "2026-09-01T00:00:00.000Z",
			end: "2026-09-02T00:00:00Z",
			include_4xx: "true",
		});
		assert.equal(calls[3].url.search, "");
		assert.equal(calls[4].url.search, "", "false is never sent");
		assert.deepEqual([...calls[5].url.searchParams.keys()], ["start", "end"]);
		assert.deepEqual(
			[...calls[6].url.searchParams.keys()],
			["start", "end", "path"],
		);
		assert.equal(calls[7].url.search, "", '"" is never sent');
		assert.equal(calls[8].url.search, "");
	});

	test('empty, "." and ".." ids are rejected before sending (they would change the route)', async () => {
		const { api, calls } = mock(() => ok({}));
		for (const id of ["", ".", ".."]) {
			await assert.rejects(
				api.apps.delete(id),
				isError({ status: 0, code: "INVALID_ID", path: `/v2/apps/${id}` }),
			);
			await assert.rejects(
				api.apps.files.list(id),
				isError({ code: "INVALID_ID", path: `/v2/apps/${id}/files` }),
			);
			await assert.rejects(
				api.workspaces.get(id),
				isError({ code: "INVALID_ID" }),
			);
		}
		await api.apps.get("a.b");
		assert.equal(calls.length, 1);
		assert.equal(calls[0].url.pathname, "/v2/apps/a.b");
	});

	test("BASE_URL is exported without a trailing slash", () => {
		assert.equal(BASE_URL, "https://api.squarecloud.app/v2");
	});

	test("custom baseUrl, with or without trailing slash", async () => {
		for (const baseUrl of ["http://localhost:1/v2", "http://localhost:1/v2/"]) {
			const { api, calls } = mock(() => ok([]), { baseUrl });
			await api.apps.domains();
			assert.equal(calls[0].url.href, "http://localhost:1/v2/apps/domains");
		}
	});

	test("rejects a missing, empty or whitespace-only API key", () => {
		for (const key of ["", "   ", "\t\n", undefined]) {
			assert.throws(() => new SquareCloudAPI(key as string), TypeError);
		}
	});

	test("userAgent replaces the whole header", async () => {
		const { api, calls } = mock(() => ok({}), { userAgent: "my-bot/1.0" });
		await api.apps.get("a1");
		await api.downloadSnapshot("https://snapshots.squarecloud.app/a.zip?k");
		assert.equal(calls[0].headers["User-Agent"], "my-bot/1.0");
		assert.equal(calls[1].headers["User-Agent"], "my-bot/1.0");
	});
});

describe("errors", () => {
	test("keeps status, code, server message, method and path", async () => {
		const { api } = mock(() =>
			json(403, {
				status: "error",
				code: "MISSING_SCOPE",
				message: "This API key lacks the apps:control scope",
			}),
		);
		await assert.rejects(
			api.apps.restart("a1"),
			isError({
				status: 403,
				code: "MISSING_SCOPE",
				message: "This API key lacks the apps:control scope",
				method: "POST",
				path: "/v2/apps/a1/restart",
			}),
		);
	});

	test("413/429/502 keep the real code (no synthetic codes)", async () => {
		for (const [status, code] of [
			[413, "FILE_TOO_LARGE"],
			[429, "DAILY_SNAPSHOTS_LIMIT_REACHED"],
			[429, "KEEP_CALM"],
			[502, "DNS_FAILED"],
		] as const) {
			const { api } = mock(() => json(status, { status: "error", code }));
			await assert.rejects(
				api.apps.snapshots.create("a1"),
				isError({ status, code }),
			);
		}
	});

	test("non-JSON error pages become UNKNOWN_ERROR with the status", async () => {
		const { api } = mock(
			() => new Response("<html>bad gateway</html>", { status: 504 }),
		);
		await assert.rejects(
			api.apps.start("a1"),
			isError({ status: 504, code: "UNKNOWN_ERROR", message: "HTTP 504" }),
		);
	});

	test("a 2xx with status 'error' is an error (relayed cluster failures)", async () => {
		const { api } = mock(() =>
			json(200, {
				status: "error",
				code: "CONTAINER_NOT_FOUND",
				message: "gone",
			}),
		);
		await assert.rejects(
			api.databases.start("d1"),
			isError({ status: 200, code: "CONTAINER_NOT_FOUND", message: "gone" }),
		);
	});

	test("a 409 with only a code (start/stop): the message is the code", async () => {
		const { api } = mock(() =>
			json(409, { status: "error", code: "CONTAINER_ALREADY_STARTED" }),
		);
		await assert.rejects(
			api.databases.start("d1"),
			isError({
				status: 409,
				code: "CONTAINER_ALREADY_STARTED",
				message: "CONTAINER_ALREADY_STARTED",
			}),
		);
	});

	test("a 2xx that is not JSON is an error, never a silent undefined", async () => {
		const { api } = mock(
			() => new Response("<html>captive portal</html>", { status: 200 }),
		);
		await assert.rejects(
			api.apps.get("a1"),
			isError({
				status: 200,
				code: "UNKNOWN_ERROR",
				message: "Invalid JSON in HTTP 200 response",
			}),
		);
		await assert.rejects(api.apps.get("a1"), (error) => {
			assert.ok(
				(error as Error).cause instanceof SyntaxError,
				"cause is the JSON error",
			);
			return true;
		});
	});

	test("a 2xx status 'error' without code or message is not called invalid JSON", async () => {
		const { api } = mock(() => json(200, { status: "error" }));
		await assert.rejects(
			api.databases.stop("d1"),
			isError({ status: 200, code: "UNKNOWN_ERROR", message: "HTTP 200" }),
		);
	});

	test("routes without the envelope still throw on HTTP errors", async () => {
		const { api } = mock(() =>
			json(500, { status: "error", code: "INTERNAL_SERVER_ERROR" }),
		);
		await assert.rejects(
			api.service.status(),
			isError({ status: 500, code: "INTERNAL_SERVER_ERROR" }),
		);
	});

	test("AI: an OpenAI error without code falls back to its type", async () => {
		const { api } = mock(() =>
			json(500, { error: { message: "m", type: "server_error" } }),
		);
		await assert.rejects(
			api.ai.chat({ messages: [] }),
			isError({ status: 500, code: "server_error", message: "m" }),
		);
	});

	test("`error: null` is not the AI dialect: the envelope's code is kept", async () => {
		const { api } = mock(() =>
			json(404, { status: "error", code: "APP_NOT_FOUND", error: null }),
		);
		await assert.rejects(
			api.apps.get("a1"),
			isError({ status: 404, code: "APP_NOT_FOUND" }),
		);
	});

	test("AI: OpenAI dialect and Square envelope", async () => {
		let { api } = mock(() =>
			json(403, {
				error: {
					message: "Upgrade",
					type: "invalid_request_error",
					code: "upgrade_required",
				},
			}),
		);
		await assert.rejects(
			api.ai.chat({ messages: [{ role: "user", content: "hi" }] }),
			isError({ status: 403, code: "upgrade_required", message: "Upgrade" }),
		);
		({ api } = mock(() =>
			json(401, { status: "error", code: "ACCESS_DENIED" }),
		));
		await assert.rejects(
			api.ai.chat({ messages: [] }),
			isError({ status: 401, code: "ACCESS_DENIED", message: "ACCESS_DENIED" }),
		);
	});

	test("AI: auth, 429 and 503 arrive OpenAI-shaped with lowercase codes, never retried", async () => {
		for (const [status, type, code] of [
			[401, "authentication_error", "access_denied"],
			[403, "permission_error", "missing_scope"],
			[429, "rate_limit_error", "rate_limited"],
			[503, "server_error", "database_unavailable"],
		] as const) {
			const { api, calls } = mock(() =>
				json(status, { error: { message: "m", type, param: null, code } }),
			);
			await assert.rejects(
				api.ai.chat({ messages: [] }),
				isError({ status, code, message: "m" }),
			);
			assert.equal(calls.length, 1, code);
		}
		// `code: null` (a platform error without one): the type is the code
		const { api } = mock(() =>
			json(503, {
				error: { message: "m", type: "server_error", param: null, code: null },
			}),
		);
		await assert.rejects(
			api.ai.chat({ messages: [] }),
			isError({ status: 503, code: "server_error" }),
		);
	});

	test("an expired key is 401 ACCESS_DENIED, like an unknown one", async () => {
		const { api, calls } = mock(() =>
			json(401, { status: "error", code: "ACCESS_DENIED" }),
		);
		await assert.rejects(
			api.account.me(),
			isError({ status: 401, code: "ACCESS_DENIED" }),
		);
		assert.equal(calls.length, 1, "never retried");
	});

	test("network errors: status 0, NETWORK_ERROR, cause attached", async () => {
		const cause = Object.assign(new TypeError("fetch failed"), {
			cause: { code: "ECONNREFUSED" },
		});
		const { api } = mock(() => Promise.reject(cause), { maxRetries: 0 });
		await assert.rejects(
			api.apps.stop("a1"),
			isError({ status: 0, code: "NETWORK_ERROR", cause, method: "POST" }),
		);
	});

	test("timeouts: TIMEOUT, not retried", async () => {
		const { api, calls } = mock(
			({ init }) =>
				new Promise((_, reject) =>
					init.signal?.addEventListener("abort", () =>
						reject(init.signal?.reason),
					),
				),
			{ timeoutMs: 20 },
		);
		await assert.rejects(
			api.apps.get("a1"),
			isError({ status: 0, code: "TIMEOUT" }),
		);
		assert.equal(calls.length, 1);
	});

	test("timeoutMs <= 0, Infinity or >= 2^31 means no timeout, not an instant one", async () => {
		for (const timeoutMs of [0, -1, Number.POSITIVE_INFINITY, 2 ** 31]) {
			const { api, calls } = mock(
				({ init }) =>
					new Promise((resolve, reject) => {
						const timer = setTimeout(() => resolve(ok({ id: "a1" })), 30);
						init.signal?.addEventListener("abort", () => {
							clearTimeout(timer);
							reject(init.signal?.reason);
						});
					}),
				{ timeoutMs },
			);
			assert.deepEqual(await api.apps.get("a1"), { id: "a1" });
			assert.equal(calls[0].init.signal, undefined);
		}
	});

	test("abort rejects with the signal's reason and is never retried", async () => {
		const controller = new AbortController();
		const { api, calls } = mock(({ init }) =>
			Promise.reject(init.signal?.reason),
		);
		controller.abort();
		await assert.rejects(
			api.apps.create(new Uint8Array([1]), { signal: controller.signal }),
			{ name: "AbortError" },
		);
		assert.equal(calls.length, 1);
	});

	test("abort during a retry backoff ends at once", async () => {
		const controller = new AbortController();
		const { api, calls } = mock(() => {
			controller.abort(); // lands before the backoff starts
			return json(503, { status: "error", code: "UPLOAD_BUSY" });
		});
		const started = performance.now();
		await assert.rejects(
			api.apps.create(new Uint8Array([1]), { signal: controller.signal }),
			{ name: "AbortError" },
		);
		assert.equal(calls.length, 1);
		assert.ok(performance.now() - started < 200, "did not wait the backoff");
	});

	test("calls the server holds open wait past the default timeout", async () => {
		const later = (response: () => Response) =>
			mock(
				({ init }) =>
					new Promise<Response>((resolve, reject) => {
						const timer = setTimeout(() => resolve(response()), 60);
						init.signal?.addEventListener("abort", () => {
							clearTimeout(timer);
							reject(init.signal?.reason);
						});
					}),
				{ timeoutMs: 20 },
			);
		// A 202 arrives at ~90 s in production: it must not be cut at timeoutMs
		let { api } = later(() =>
			json(202, { status: "error", code: "SNAPSHOT_PROCESSING" }),
		);
		assert.deepEqual(await api.apps.snapshots.create("a1"), { pending: true });
		({ api } = later(() => json(200, { status: "success" })));
		await api.apps.restart("a1");
		await api.databases.snapshots.restore("d1", "n", "v");
		// An ordinary call still times out
		await assert.rejects(api.apps.get("a1"), isError({ code: "TIMEOUT" }));
	});

	test("timeout floors: 120 s for held-open calls and ai.chat", async (t) => {
		const timer = t.mock.method(globalThis, "setTimeout");
		const { api } = mock(() => json(200, { status: "success" }), {
			timeoutMs: 20,
		});
		const delay = async (call: () => Promise<unknown>) => {
			timer.mock.resetCalls();
			await call();
			return timer.mock.calls[0].arguments[1];
		};
		assert.equal(await delay(() => api.apps.get("a1")), 20);
		assert.equal(await delay(() => api.apps.restart("a1")), 120_000);
		assert.equal(await delay(() => api.databases.create({} as never)), 120_000);
		assert.equal(await delay(() => api.ai.chat({ messages: [] })), 120_000);
		// A larger timeoutMs wins over the floor
		const big = mock(() => json(200, { status: "success" }), {
			timeoutMs: 900_000,
		});
		timer.mock.resetCalls();
		await big.api.ai.chat({ messages: [] });
		assert.equal(timer.mock.calls[0].arguments[1], 900_000);
		// A disabled timeout disables the floors too
		for (const timeoutMs of [0, -5, Number.POSITIVE_INFINITY, 2 ** 31]) {
			const off = mock(() => json(200, { status: "success" }), { timeoutMs });
			timer.mock.resetCalls();
			await off.api.apps.restart("a1");
			await off.api.ai.chat({ messages: [] });
			await off.api.apps.snapshots.create("a1");
			assert.equal(timer.mock.callCount(), 0, `timeoutMs ${timeoutMs}`);
		}
	});
});

describe("retries", () => {
	const flaky = (first: () => Response | Promise<Response>, options = {}) =>
		mock((_, index) => (index === 0 ? first() : ok({ id: "a1" })), {
			maxRetries: 1,
			...options,
		});

	test("network error on GET is retried", async () => {
		const { api, calls } = flaky(() =>
			Promise.reject(new TypeError("fetch failed")),
		);
		assert.deepEqual(await api.apps.get("a1"), { id: "a1" });
		assert.equal(calls.length, 2);
	});

	test("network error on a mutation is not retried", async () => {
		const { api, calls } = flaky(() =>
			Promise.reject(new TypeError("fetch failed")),
		);
		await assert.rejects(
			api.apps.restart("a1"),
			isError({ code: "NETWORK_ERROR" }),
		);
		assert.equal(calls.length, 1);
	});

	test("a body that drops mid-read on GET is retried", async () => {
		const { api, calls } = flaky(
			() => new Response(chunked(['{"status":'], new TypeError("terminated"))),
		);
		assert.deepEqual(await api.apps.get("a1"), { id: "a1" });
		assert.equal(calls.length, 2);
	});

	test("AI 503 server_overloaded is not retried (only the listed 503 codes are)", async () => {
		const { api, calls } = flaky(() =>
			json(503, {
				error: {
					message: "busy",
					type: "server_error",
					code: "server_overloaded",
				},
			}),
		);
		await assert.rejects(
			api.ai.chat({ messages: [] }),
			isError({ status: 503, code: "server_overloaded" }),
		);
		assert.equal(calls.length, 1);
	});

	test("503 UPLOAD_BUSY is retried, even on POST", async () => {
		const { api, calls } = flaky(() =>
			json(503, { status: "error", code: "UPLOAD_BUSY" }),
		);
		await api.apps.create(new Uint8Array([1]));
		assert.equal(calls.length, 2);
		assert.ok(calls[1].body instanceof FormData, "the upload is re-sent");
	});

	test("503 UPLOAD_BUSY re-sends a disk-backed upload", async () => {
		const dir = mkdtempSync(join(tmpdir(), "sqcloud-"));
		try {
			const file = join(dir, "app.zip");
			writeFileSync(file, "zip-content");
			const { api, calls } = flaky(() =>
				json(503, { status: "error", code: "UPLOAD_BUSY" }),
			);
			await api.apps.create(file);
			assert.equal(calls.length, 2);
			const part = (calls[1].body as FormData).get("file") as File;
			assert.equal(await part.text(), "zip-content");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test("503 ANALYTICS_BUSY is retried", async () => {
		const { api, calls } = flaky(() =>
			json(503, { status: "error", code: "ANALYTICS_BUSY" }),
		);
		await api.apps.network.logs("a1", "a", "b");
		assert.equal(calls.length, 2);
	});

	test("503 DATABASE_UNAVAILABLE: GET only", async () => {
		const busy = () =>
			json(503, { status: "error", code: "DATABASE_UNAVAILABLE" });
		let { api, calls } = flaky(busy);
		await api.databases.get("d1");
		assert.equal(calls.length, 2);
		({ api, calls } = flaky(busy));
		await assert.rejects(api.databases.start("d1"), isError({ status: 503 }));
		assert.equal(calls.length, 1);
	});

	test("429 is never retried", async () => {
		for (const code of [
			"RATE_LIMITED",
			"KEEP_CALM",
			"RATE_LIMIT",
			"RATE_LIMIT_EXCEEDED",
		]) {
			const { api, calls } = flaky(() => json(429, { status: "error", code }));
			await assert.rejects(api.apps.get("a1"), isError({ status: 429, code }));
			assert.equal(calls.length, 1);
		}
	});

	test("backoff: min(8 s, 500 ms * 2^n) * U(0.5, 1), always before the retry", async (t) => {
		// An upload has no timeout timer: every setTimeout here is a backoff wait
		const real = globalThis.setTimeout;
		const waits: [ms: number, callsSoFar: number][] = [];
		let sent = 0;
		t.mock.method(globalThis, "setTimeout", (fn: () => void, ms: number) => {
			waits.push([ms, sent]);
			return real(fn, 0);
		});
		const random = t.mock.method(Math, "random", () => 0);
		const { api } = mock(
			() => {
				sent++;
				return json(503, { status: "error", code: "UPLOAD_BUSY" });
			},
			{ maxRetries: 6 },
		);
		const run = async () => {
			waits.length = sent = 0;
			await assert.rejects(api.apps.create(new Uint8Array([1])));
			return waits;
		};
		// Wait n comes after attempt n+1 was sent, and before the next one
		const expected = (factor: number) =>
			[500, 1000, 2000, 4000, 8000, 8000].map((ms, n) => [ms * factor, n + 1]);
		assert.deepEqual(await run(), expected(0.5));
		random.mock.mockImplementation(() => 1);
		assert.deepEqual(await run(), expected(1));
		assert.equal(sent, 7);
	});

	test("gives up after maxRetries", async () => {
		const { api, calls } = mock(
			() => json(503, { status: "error", code: "UPLOAD_BUSY" }),
			{
				maxRetries: 2,
			},
		);
		await assert.rejects(
			api.apps.create(new Uint8Array([1])),
			isError({ code: "UPLOAD_BUSY" }),
		);
		assert.equal(calls.length, 3);
	});
});

describe("snapshots", () => {
	const listed = {
		name: "uuid_javascript_manual",
		size: 1,
		modified: "2026-09-01T00:00:00Z",
		key: "AWSAccessKeyId=K&Expires=1&Signature=a%2Bb&versionId=v+1/2=_-X",
		version_id: "v+1/2=_-X",
		url: "https://snapshots.squarecloud.app/o/n.zip?k",
		runtime: "javascript",
		origin: "manual",
	};

	test("202 SNAPSHOT_PROCESSING is a pending result, not an error", async () => {
		const { api } = mock(() =>
			json(202, { status: "error", code: "SNAPSHOT_PROCESSING" }),
		);
		assert.deepEqual(await api.apps.snapshots.create("a1"), { pending: true });
		assert.deepEqual(await api.databases.snapshots.create("d1"), {
			pending: true,
		});
	});

	test("200 returns the signed URL", async () => {
		const { api } = mock(() => ok({ url: "https://s/x.zip?k", key: "k" }));
		assert.deepEqual(await api.apps.snapshots.create("a1"), {
			pending: false,
			url: "https://s/x.zip?k",
			key: "k",
		});
	});

	test("list passes version_id and url through untouched; restore takes name and version_id", async () => {
		const { api, calls } = mock((_, index) =>
			index === 0 ? ok([listed]) : ok(),
		);
		const [snapshot] = await api.apps.snapshots.list("a1");
		assert.deepEqual(snapshot, listed);
		await api.apps.snapshots.restore("a1", snapshot.name, snapshot.version_id);
		assert.deepEqual(calls[1].body, {
			snapshotId: "uuid_javascript_manual",
			versionId: "v+1/2=_-X",
		});
	});

	test("downloadSnapshot streams with the User-Agent only (never the key), untimed, and checks the status", async () => {
		const { api, calls } = mock((_, index) =>
			index === 0
				? new Response("zipbytes")
				: index === 1
					? new Response("<Error/>", { status: 403 })
					: json(404, { status: "error", code: "SNAPSHOT_NOT_FOUND" }),
		);
		const url = "https://snapshots.squarecloud.app/a/o/n.zip?k";
		const stream = await api.downloadSnapshot(url);
		assert.ok(stream instanceof ReadableStream);
		assert.equal(await new Response(stream).text(), "zipbytes");
		assert.equal(calls[0].url.href, url);
		assert.deepEqual(Object.keys(calls[0].headers), ["User-Agent"]);
		assert.match(calls[0].headers["User-Agent"], /^squarecloud-sdk-js\//);
		assert.equal(calls[0].init.signal, undefined, "no timeout");
		await assert.rejects(
			api.downloadSnapshot(url),
			isError({
				status: 403,
				code: "UNKNOWN_ERROR",
				message: "HTTP 403",
				method: "GET",
				path: "/a/o/n.zip",
			}),
		);
		await assert.rejects(
			api.downloadSnapshot(url),
			isError({ status: 404, code: "SNAPSHOT_NOT_FOUND" }),
		);
	});

	test("downloadSnapshot of a bodiless 2xx is an empty stream, never null", async () => {
		const { api } = mock(() => new Response(null, { status: 204 }));
		const stream = await api.downloadSnapshot(
			"https://snapshots.squarecloud.app/a.zip?k",
		);
		assert.ok(stream instanceof ReadableStream);
		assert.equal((await new Response(stream).arrayBuffer()).byteLength, 0);
	});

	test("downloadSnapshot retries network errors, then gives up; abort is rethrown", async () => {
		const url = "https://snapshots.squarecloud.app/a/o/n.zip?k";
		const cause = new TypeError("fetch failed");
		let { api, calls } = mock(
			(_, index) =>
				index === 0 ? Promise.reject(cause) : new Response("zipbytes"),
			{ maxRetries: 1 },
		);
		assert.equal(
			await new Response(await api.downloadSnapshot(url)).text(),
			"zipbytes",
		);
		assert.equal(calls.length, 2);

		({ api, calls } = mock(() => Promise.reject(cause), { maxRetries: 1 }));
		await assert.rejects(
			api.downloadSnapshot(url),
			isError({ status: 0, code: "NETWORK_ERROR", cause }),
		);
		assert.equal(calls.length, 2);

		const controller = new AbortController();
		controller.abort();
		({ api } = mock(({ init }) => Promise.reject(init.signal?.reason)));
		await assert.rejects(
			api.downloadSnapshot(url, { signal: controller.signal }),
			{ name: "AbortError" },
		);
	});
});

describe("payloads", () => {
	const all = Uint8Array.from({ length: 256 }, (_, i) => i);
	const text = "héllo, 世界 \u{1F600}\n";

	test("files.read asks for base64 and decodes it: bytes 0-255 and UTF-8 text", async () => {
		const { api, calls } = mock((call) =>
			ok({
				encoding: "base64",
				data: Buffer.from(
					call.url.searchParams.get("path") === "/all.bin" ? all : text,
				).toString("base64"),
			}),
		);
		const bytes = await api.apps.files.read("a1", "/all.bin");
		assert.ok(bytes instanceof Uint8Array);
		assert.deepEqual(bytes, all);
		assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), {
			path: "/all.bin",
			encoding: "base64",
		});
		const utf8 = await api.apps.files.read("a1", "/t.txt");
		assert.equal(new TextDecoder().decode(utf8), text);
	});

	test("files.write: strings as plain text, bytes as base64 (0-255 and UTF-8)", async () => {
		const { api, calls } = mock(() => json(200, { status: "success" }));
		await api.apps.files.write("a1", "/a.txt", text);
		await api.apps.files.write("a1", "/all.bin", all);
		await api.apps.files.write("a1", "/u.txt", new TextEncoder().encode(text));
		assert.deepEqual(calls[0].body, { path: "/a.txt", content: text });
		assert.deepEqual(calls[1].body, {
			path: "/all.bin",
			content: Buffer.from(all).toString("base64"),
			encoding: "base64",
		});
		assert.deepEqual(
			Buffer.from((calls[2].body as { content: string }).content, "base64"),
			Buffer.from(text),
		);
		assert.ok(calls[0].init.signal, "small writes keep the timeout");
	});

	test("files.write: empty content is sent as is (an empty file)", async () => {
		const { api, calls } = mock(() => json(200, { status: "success" }));
		await api.apps.files.write("a1", "/empty", "");
		await api.apps.files.write("a1", "/empty.bin", new Uint8Array());
		assert.deepEqual(calls[0].body, { path: "/empty", content: "" });
		assert.deepEqual(calls[1].body, {
			path: "/empty.bin",
			content: "",
			encoding: "base64",
		});
	});

	test("files.list of a missing directory is 404 FILE_NOT_FOUND", async () => {
		const { api, calls } = mock(() =>
			json(404, { status: "error", code: "FILE_NOT_FOUND" }),
		);
		await assert.rejects(
			api.apps.files.list("a1", "/missing"),
			isError({ status: 404, code: "FILE_NOT_FOUND" }),
		);
		assert.equal(calls.length, 1, "never retried");
	});

	test("files.write: a large write is an upload, with no timeout but a signal", async () => {
		const { api, calls } = mock(() => json(200, { status: "success" }));
		const bytes = new Uint8Array(2 * 1024 * 1024).fill(0xff);
		const controller = new AbortController();
		await api.apps.files.write("a1", "/big.bin", bytes);
		await api.apps.files.write("a1", "/big.bin", bytes, {
			signal: controller.signal,
		});
		assert.equal(calls[0].init.signal, undefined);
		assert.equal(calls[1].init.signal, controller.signal);
		const { content } = calls[0].body as { content: string };
		assert.deepEqual(Buffer.from(content, "base64"), Buffer.from(bytes));
		// Measured in UTF-8 bytes, not UTF-16 units: 400k CJK chars are ~1.2 MB
		await api.apps.files.write("a1", "/cjk.txt", "界".repeat(400_000));
		await api.apps.files.write("a1", "/small.txt", "é".repeat(400_000));
		assert.equal(calls[2].init.signal, undefined, "1.2 MB: untimed");
		assert.ok(calls[3].init.signal, "800 KB: timed");
	});

	test("files.write fails locally above 10 MB", async () => {
		const { api, calls } = mock(() => ok());
		await assert.rejects(
			api.apps.files.write("a1", "/big", new Uint8Array(10 * 1024 * 1024 + 1)),
			isError({ status: 0, code: "FILE_TOO_LARGE" }),
		);
		await assert.rejects(
			api.apps.files.write("a1", "/big", "é".repeat(5 * 1024 * 1024 + 1)),
			isError({ code: "FILE_TOO_LARGE" }),
		);
		assert.equal(calls.length, 0);
	});

	test("routes without the envelope return the whole body", async () => {
		const status = { status: "online", message: "All services are online." };
		const { api } = mock(() => json(200, status));
		assert.deepEqual(await api.service.status(), status);
	});

	// Shapes seen on the live API that the spec does not show. The
	// annotations are the regression check: `pnpm typecheck` fails if a type
	// makes these keys required or non-null again.
	test("live shapes: omitted domain/custom, extra create keys, null percentiles, sparse file entries", async () => {
		// GET /apps/{id} drops `custom` (and `domain` on non-web apps) when unset
		const app: App = {
			id: "a1",
			name: "n",
			owner: "u",
			cluster: "c",
			ram: 256,
			language: "javascript",
			created_at: "t",
		};
		let { api } = mock(() => ok(app));
		const got = await api.apps.get("a1");
		assert.equal("custom" in got, false);
		assert.equal(got.custom ?? null, null);
		// POST /apps sends the full `domain` host and `cluster`
		const created: AppCreated = {
			id: "a1",
			name: "n",
			domain: "n.squareweb.app",
			ram: 512,
			cpu: 1,
			language: { name: "javascript", version: "recommended" },
			cluster: "c",
		};
		({ api } = mock(() => ok(created)));
		assert.deepEqual(await api.apps.create(new Uint8Array([1])), created);
		// A window with no requests: the summary percentiles are null (not `{}`)
		const none: Percentiles = { p50: null, p95: null, p99: null };
		const performance: NetworkPerformance = {
			summary: { edge: none, origin: none, requests: 0 },
			timeseries: [],
			countries: [],
			colos: [],
			slowest_paths: [],
		};
		({ api } = mock(() => ok(performance)));
		assert.deepEqual(
			await api.apps.network.performance("a1", "a", "b"),
			performance,
		);
		// Workspace apps and account summaries drop them too
		const summary: AppSummary = {
			id: "a1",
			name: "n",
			ram: 256,
			lang: "javascript",
			cluster: "c",
			created_at: "t",
		};
		const shared: Workspace["applications"][number] = {
			id: "a1",
			name: "n",
			desc: null,
			ram: 256,
			lang: "javascript",
		};
		assert.equal(summary.custom ?? shared.custom ?? null, null);
		// Files: a fractional mtime, and a directory entry without size/mtime
		const files: FileEntry[] = [
			{ name: "a.js", type: "file", size: 9, lastModified: 1790518259302.0295 },
			{ name: "src", type: "directory" },
		];
		({ api } = mock(() => ok(files)));
		assert.deepEqual(await api.apps.files.list("a1"), files);
	});

	test("a failed deploy ends in an `error` event with code and message", async () => {
		const timeline: DeployEvent[] = [
			{ id: "c0ffee", state: "pending", date: "t", source: "git" },
			{
				id: "c0ffee",
				state: "error",
				date: "t",
				source: "git",
				code: "CLONE_FAILED",
				message: "Repository not found",
			},
		];
		const { api } = mock(() => ok([timeline]));
		const [deploy] = await api.apps.deploys.list("a1");
		assert.deepEqual(deploy, timeline);
		assert.equal(deploy.at(-1)?.state, "error");
		assert.equal(deploy.at(-1)?.code, "CLONE_FAILED");
	});

	test("empty analytics windows return null", async () => {
		const { api } = mock(() => ok({}));
		assert.equal(await api.apps.network.analytics("a1", "a", "b"), null);
		assert.equal(await api.apps.network.errors("a1", "a", "b"), null);
		assert.equal(await api.apps.network.performance("a1", "a", "b"), null);
	});

	test("a 2xx without `response`: null windows and empty snapshot lists, never a TypeError", async () => {
		const { api } = mock(() => json(200, { status: "success" }));
		assert.equal(await api.apps.network.analytics("a1", "a", "b"), null);
		assert.equal(await api.apps.network.errors("a1", "a", "b"), null);
		assert.equal(await api.apps.network.performance("a1", "a", "b"), null);
		assert.deepEqual(await api.apps.snapshots.list("a1"), []);
		assert.deepEqual(await api.databases.snapshots.list("d1"), []);
		assert.deepEqual(await api.account.snapshots(), []);
	});

	test('string results are never undefined: "" when the API sends none', async () => {
		let { api } = mock(() => ok({ password: "p" }));
		assert.equal(await api.databases.resetCredentials("d1", "password"), "p");
		({ api } = mock(() => json(200, { status: "success" })));
		assert.equal(await api.databases.resetCredentials("d1", "certificate"), "");
		assert.equal(await api.apps.deploys.setWebhook("a1", "@"), "");
		assert.deepEqual(await api.apps.deploys.current("a1"), {});
		assert.equal(await api.apps.logs("a1"), "");
		assert.equal(await api.databases.certificate("d1"), "");
		assert.equal(await api.workspaces.members.inviteCode(), "");
		assert.deepEqual(await api.apps.files.read("a1", "/f"), new Uint8Array());
		assert.deepEqual(
			await api.apps.deploys.linkGithubApp("a1", "o/r", "main"),
			{},
		);
		// A `response` without the field
		({ api } = mock(() => ok({})));
		assert.equal(await api.apps.logs("a1"), "");
		assert.equal(await api.databases.certificate("d1"), "");
		assert.equal(await api.workspaces.members.inviteCode(), "");
		assert.deepEqual(await api.apps.files.read("a1", "/f"), new Uint8Array());
		assert.deepEqual(
			await api.apps.deploys.linkGithubApp("a1", "o/r", "main"),
			{},
		);
	});

	test("linkGithubApp sends the pinned body and returns the repository", async () => {
		const repository = { id: 1, full_name: "o/r", branch: "main" };
		const { api, calls } = mock(() => ok({ repository }));
		assert.deepEqual(
			await api.apps.deploys.linkGithubApp("a1", "o/r", "main"),
			repository,
		);
		assert.deepEqual(calls[0].body, {
			repositoryName: "o/r",
			repositoryBranch: "main",
		});
		assert.ok(calls[0].init.signal, "the default timeout applies");
	});
});
