import assert from "node:assert/strict";
import { mkdtempSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, type TestContext, test } from "node:test";
import { type RealtimeEvent, SquareCloudAPIError } from "../src/index.ts";
import { chunked, json, mock, ok } from "./helpers.ts";

const collect = async (events: AsyncIterable<RealtimeEvent>) => {
	const all: RealtimeEvent[] = [];
	for await (const event of events) all.push(event);
	return all;
};

const sse = (body: ReadableStream<Uint8Array>) =>
	new Response(body, { headers: { "content-type": "text/event-stream" } });

/**
 * Runs `run` on a mocked clock (setTimeout, Date) that jumps 500 ms whenever the
 * event loop idles, so the 5.5 s reconnect pacing costs no real time.
 */
async function fastClock<T>(t: TestContext, run: () => Promise<T>) {
	t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
	let done = false;
	const result = run().finally(() => {
		done = true;
	});
	result.catch(() => {}); // handled by the caller, after the loop
	while (!done) {
		await new Promise((resolve) => setImmediate(resolve));
		t.mock.timers.tick(500);
	}
	return result;
}

describe("realtime (SSE)", () => {
	test("parses frames split anywhere, per the SSE rules", async () => {
		const euro = new TextEncoder().encode("€"); // 3 bytes, split across chunks
		const { api, calls } = mock(() =>
			sse(
				chunked([
					": comment\n",
					"event: system\ndata: REALTIME_CONNECTING | x\n\n",
					"event:logs\r\ndata:\u0001listening on ",
					euro.slice(0, 1),
					euro.slice(1),
					"\r\n\r\n",
					"event: logs\ndata: \u0002two  spaces\nid: 7\n\n",
					"event: logs\ndata: no prefix\n\n",
					"data: first\ndata:\ndata:  last\n\n",
					"id: a\u0000b\ndata: nul id\n\n", // an id with NUL is ignored
					"event: error\ndata: CONTAINER_NOT_FOUND\n\n",
					"event: ignored\n\n", // no data: not dispatched
					"data: unterminated", // dropped at EOF
				]),
			),
		);
		const events = await collect(api.apps.realtime("a1"));
		assert.equal(calls[0].headers.Accept, "text/event-stream");
		assert.deepEqual(events, [
			{ event: "system", data: "REALTIME_CONNECTING | x", id: undefined },
			{
				event: "logs",
				data: "\u0001listening on €",
				id: undefined,
				stream: "stdout",
				line: "listening on €",
			},
			{
				event: "logs",
				data: "\u0002two  spaces",
				id: "7",
				stream: "stderr",
				line: "two  spaces",
			},
			{
				event: "logs",
				data: "no prefix",
				id: "7",
				stream: "stdout",
				line: "no prefix",
			},
			{ event: "message", data: "first\n\n last", id: "7" },
			{ event: "message", data: "nul id", id: "7" },
			{ event: "error", data: "CONTAINER_NOT_FOUND", id: "7" },
		]);
	});

	test("merges lean status frames onto the last full frame", async () => {
		const full = {
			cpu: 12.5,
			cpuLimit: 100,
			ram: [128, 512],
			status: "running",
			netIO: { i: 1, o: 2 },
			bIO: { i: 0, o: 0 },
			uptime: 1716000000000,
		};
		const lean = {
			cpu: 13.1,
			ram: [131, 512],
			netIO: { i: 3, o: 4 },
			bIO: { i: 1, o: 1 },
		};
		const { api } = mock(() =>
			sse(
				chunked([
					`event: status\ndata: ${JSON.stringify(full)}\n\n`,
					`event: status\ndata: ${JSON.stringify(lean)}\n\n`,
				]),
			),
		);
		const [first, second] = await collect(api.apps.realtime("a1"));
		assert.equal(first.event, "status");
		assert.equal(second.event, "status");
		if (second.event !== "status" || first.event !== "status") return;
		assert.deepEqual(first.status, full);
		assert.deepEqual(second.status, { ...full, ...lean });
	});

	test("the merged status survives a reconnect", async (t) => {
		const full = { cpu: 1, ram: [1, 512], status: "running", uptime: 5 };
		const lean = { cpu: 2, ram: [2, 512] };
		const { api } = mock((_, index) =>
			sse(
				index === 0
					? chunked(
							[`event: status\ndata: ${JSON.stringify(full)}\n\n`],
							new TypeError("terminated"),
						)
					: chunked([`event: status\ndata: ${JSON.stringify(lean)}\n\n`]),
			),
		);
		const events = await fastClock(t, () => collect(api.apps.realtime("a1")));
		assert.deepEqual(
			events.map((event) => event.event === "status" && event.status),
			[full, { ...full, ...lean }],
		);
	});

	test("stops at REALTIME_DISCONNECTED", async () => {
		const { api } = mock(() =>
			sse(
				chunked([
					"event: system\ndata: REALTIME_DISCONNECTED\n\n",
					"event: logs\ndata: x\n\n",
				]),
			),
		);
		assert.equal((await collect(api.apps.realtime("a1"))).length, 1);
	});

	test("checks the status before streaming", async () => {
		const { api } = mock(() =>
			json(429, {
				status: "error",
				code: "REALTIME_MAX_CONNECTIONS",
				message: "5 max",
			}),
		);
		await assert.rejects(collect(api.apps.realtime("a1")), (error) => {
			assert.ok(error instanceof SquareCloudAPIError);
			assert.equal(error.status, 429);
			assert.equal(error.code, "REALTIME_MAX_CONNECTIONS");
			return true;
		});
	});

	test("a reopen that still fails is raised as that error", async (t) => {
		const { api, calls } = mock((_, index) =>
			index === 0
				? sse(
						chunked(["event: logs\ndata: a\n\n"], new TypeError("terminated")),
					)
				: json(429, { status: "error", code: "REALTIME_MAX_CONNECTIONS" }),
		);
		const seen: string[] = [];
		await assert.rejects(
			fastClock(t, async () => {
				for await (const event of api.apps.realtime("a1"))
					seen.push(event.data);
			}),
			{ status: 429, code: "REALTIME_MAX_CONNECTIONS" },
		);
		assert.deepEqual(seen, ["a"]);
		assert.equal(calls.length, 2);
	});

	test("reconnects once the socket drops, then ends on a clean close", async (t) => {
		const { api, calls } = mock((_, index) =>
			sse(
				index === 0
					? chunked(["event: logs\ndata: a\n\n"], new TypeError("terminated"))
					: chunked(["event: logs\ndata: b\n\n"]),
			),
		);
		const events = await fastClock(t, () => collect(api.apps.realtime("a1")));
		assert.deepEqual(
			events.map((event) => event.data),
			["a", "b"],
		);
		assert.equal(calls.length, 2);
	});

	test("REALTIME_RECONNECT hands reconnection to the client, 5.5 s after the last open", async (t) => {
		const opened: number[] = [];
		const { api, calls } = mock((_, index) => {
			opened.push(Date.now());
			return sse(
				index === 0
					? chunked(["event: system\ndata: REALTIME_RECONNECT\n\n"])
					: chunked(["event: logs\ndata: b\n\n"]),
			);
		});
		const events = await fastClock(t, () => collect(api.apps.realtime("a1")));
		assert.deepEqual(
			events.map((event) => event.data),
			["REALTIME_RECONNECT", "b"],
		);
		assert.equal(calls.length, 2);
		assert.ok(opened[1] - opened[0] >= 5500, "paced to avoid KEEP_CALM");
		assert.ok(opened[1] - opened[0] < 6000, "not paced past 5.5 s");
	});

	test("system codes match by prefix; REALTIME_RECONNECT reads on until EOF", async (t) => {
		const { api, calls } = mock((_, index) =>
			sse(
				chunked(
					index === 0
						? [
								"event: system\ndata: REALTIME_RECONNECT | upstream\n\n",
								"event: logs\ndata: tail\n\n",
							]
						: ["event: system\ndata: REALTIME_DISCONNECTED | bye\n\n"],
				),
			),
		);
		const events = await fastClock(t, () => collect(api.apps.realtime("a1")));
		assert.deepEqual(
			events.map((event) => event.data),
			["REALTIME_RECONNECT | upstream", "tail", "REALTIME_DISCONNECTED | bye"],
		);
		assert.equal(calls.length, 2);
	});

	test("the reconnect budget resets on logs/status, never on system frames", async (t) => {
		// Each open delivers a log, then drops: 5 reconnects in a row stay in budget
		let { api, calls } = mock((_, index) =>
			sse(
				index < 5
					? chunked(["event: logs\ndata: x\n\n"], new TypeError("terminated"))
					: chunked([]),
			),
		);
		await fastClock(t, () => collect(api.apps.realtime("a1")));
		assert.equal(calls.length, 6);

		t.mock.timers.reset();
		// REALTIME_RECONNECT alone never resets it: the 4th hand-off in a row fails
		({ api, calls } = mock(() =>
			sse(chunked(["event: system\ndata: REALTIME_RECONNECT\n\n"])),
		));
		await assert.rejects(
			fastClock(t, () => collect(api.apps.realtime("a1"))),
			{ code: "NETWORK_ERROR", status: 0, message: "REALTIME_RECONNECT" },
		);
		assert.equal(calls.length, 4);
	});

	test("gives up after 3 reconnects in a row with NETWORK_ERROR", async (t) => {
		const drop = new TypeError("terminated");
		const { api, calls } = mock(() => sse(chunked([], drop)));
		await assert.rejects(
			fastClock(t, () => collect(api.apps.realtime("a1"))),
			(error) => {
				assert.ok(error instanceof SquareCloudAPIError);
				assert.equal(error.code, "NETWORK_ERROR");
				assert.equal(error.cause, drop);
				assert.equal(error.message, drop.message);
				return true;
			},
		);
		assert.equal(calls.length, 4);
	});

	test("abort during the reconnect wait ends at once", async () => {
		const controller = new AbortController();
		const { api } = mock(() => sse(chunked([], new TypeError("terminated"))));
		const started = performance.now();
		setTimeout(() => controller.abort(), 20);
		assert.deepEqual(
			await collect(api.apps.realtime("a1", { signal: controller.signal })),
			[],
		);
		assert.ok(performance.now() - started < 1000, "did not wait out the 5.5 s");
	});

	test("abort right after REALTIME_RECONNECT ends at once (no 5.5 s pacing wait)", async () => {
		const controller = new AbortController();
		const { api, calls } = mock(() =>
			sse(chunked(["event: system\ndata: REALTIME_RECONNECT\n\n"])),
		);
		const started = performance.now();
		for await (const _ of api.apps.realtime("a1", {
			signal: controller.signal,
		})) {
			controller.abort();
		}
		assert.equal(calls.length, 1);
		assert.ok(performance.now() - started < 1000, "did not wait out the 5.5 s");
	});

	test("a malformed status frame keeps the last status", async () => {
		const { api } = mock(() =>
			sse(
				chunked([
					'event: status\ndata: {"cpu":1,"status":"running"}\n\n',
					"event: status\ndata: not json\n\n",
					// Valid JSON but not an object: spreading it would add index keys
					'event: status\ndata: "ab"\n\n',
					"event: status\ndata: [1]\n\n",
				]),
			),
		);
		const events = await collect(api.apps.realtime("a1"));
		assert.deepEqual(
			events.map((event) => event.event === "status" && event.status),
			[
				{ cpu: 1, status: "running" },
				{ cpu: 1, status: "running" },
				{ cpu: 1, status: "running" },
				{ cpu: 1, status: "running" },
			],
		);
	});

	test("the timeout covers the headers only", async () => {
		// No headers in time: TIMEOUT
		const { api } = mock(
			({ init }) =>
				new Promise((_, reject) =>
					init.signal?.addEventListener("abort", () =>
						reject(init.signal?.reason),
					),
				),
			{ timeoutMs: 20, maxRetries: 0 },
		);
		await assert.rejects(collect(api.apps.realtime("a1")), {
			code: "TIMEOUT",
		});

		// Headers in time, body slower than the timeout: keeps streaming
		const { api: slow } = mock(
			() =>
				sse(
					new ReadableStream({
						start(stream) {
							setTimeout(() => {
								stream.enqueue(
									new TextEncoder().encode("event: logs\ndata: late\n\n"),
								);
								stream.close();
							}, 60);
						},
					}),
				),
			{ timeoutMs: 20 },
		);
		const events = await collect(slow.apps.realtime("a1"));
		assert.deepEqual(
			events.map((event) => event.data),
			["late"],
		);
	});

	test("abort ends the iteration and cancels the body", async () => {
		const controller = new AbortController();
		let cancelled = false;
		const { api } = mock(({ init }) => {
			const body = new ReadableStream<Uint8Array>({
				start(stream) {
					stream.enqueue(new TextEncoder().encode("event: logs\ndata: a\n\n"));
					init.signal?.addEventListener("abort", () =>
						stream.error(init.signal?.reason),
					);
				},
				cancel() {
					cancelled = true;
				},
			});
			return sse(body);
		});
		const seen: string[] = [];
		for await (const event of api.apps.realtime("a1", {
			signal: controller.signal,
		})) {
			seen.push(event.data);
			controller.abort();
		}
		assert.deepEqual(seen, ["a"]);

		// Breaking out of the loop cancels the stream
		const { api: api2 } = mock(() =>
			sse(
				new ReadableStream({
					start(stream) {
						stream.enqueue(
							new TextEncoder().encode("event: logs\ndata: a\n\n"),
						);
					},
					cancel() {
						cancelled = true;
					},
				}),
			),
		);
		for await (const _ of api2.apps.realtime("a1")) break;
		assert.ok(cancelled);
	});
});

describe("multipart uploads", () => {
	const dir = mkdtempSync(join(tmpdir(), "sqcloud-"));
	after(() => rmSync(dir, { recursive: true, force: true }));

	const part = (body: unknown) => (body as FormData).get("file") as File;
	const wire = (body: unknown) => new Response(body as FormData).text();
	const OCTET = /\r\nContent-Type: application\/octet-stream\r\n/;

	test("bytes: one `file` part, no timeout, multipart wire format", async () => {
		const { api, calls } = mock(() =>
			ok({
				id: "a1",
				name: "x",
				ram: 512,
				cpu: 1,
				language: { name: "js", version: "22" },
			}),
		);
		const created = await api.apps.create(new Uint8Array([80, 75, 3, 4]));
		assert.equal(created.id, "a1");
		const [{ body, init, headers, url, method }] = calls;
		assert.equal(method, "POST");
		assert.equal(url.pathname, "/v2/apps");
		assert.ok(body instanceof FormData);
		assert.deepEqual([...body.keys()], ["file"]);
		assert.equal(part(body).name, "app.zip");
		assert.equal(part(body).size, 4);
		assert.equal(init.signal, undefined, "uploads have no timeout");
		assert.equal(headers["Content-Type"], undefined, "fetch sets the boundary");
		const text = await wire(body);
		assert.match(text, OCTET);
		assert.match(
			text,
			/Content-Disposition: form-data; name="file"; filename="app.zip"/,
		);
		assert.ok(text.includes("PK\u0003\u0004"));
	});

	test("a path is opened as a disk-backed Blob and keeps its name", async () => {
		const file = join(dir, "bot.zip");
		writeFileSync(file, "zip-content");
		const { api, calls } = mock(() => json(200, { status: "success" }));
		await api.apps.commit("a1", file, { path: "/src" });
		assert.equal(calls[0].url.pathname, "/v2/apps/a1/commit");
		assert.equal(calls[0].url.searchParams.get("path"), "/src");
		assert.equal(part(calls[0].body).name, "bot.zip");
		assert.equal(await part(calls[0].body).text(), "zip-content");
		assert.match(await wire(calls[0].body), OCTET);
	});

	test("File/Blob inputs are passed through, filename overridable", async () => {
		const { api, calls } = mock(() => json(200, { status: "success" }));
		const blob = new File(["x"], "index.js");
		await api.apps.commit("a1", blob);
		await api.apps.commit("a1", new Blob(["y"]), { filename: "main.py" });
		assert.equal(part(calls[0].body).name, "index.js");
		assert.equal(part(calls[1].body).name, "main.py");
	});

	test("the part is always application/octet-stream, whatever the File's type", async () => {
		const { api, calls } = mock(() => json(200, { status: "success" }));
		await api.apps.commit(
			"a1",
			new File(["PK"], "a.zip", { type: "application/zip" }),
		);
		const body = await wire(calls[0].body);
		assert.match(body, OCTET);
		assert.ok(!body.includes("application/zip"));
		assert.equal(part(calls[0].body).name, "a.zip");
		assert.equal(await part(calls[0].body).text(), "PK");
	});

	test("CR and LF in the filename are stripped, quotes escaped", async () => {
		const { api, calls } = mock(() => json(200, { status: "success" }));
		await api.apps.commit("a1", new Uint8Array([1]), {
			filename: 'a"b\rc\nd.txt',
		});
		assert.match(await wire(calls[0].body), /filename="a%22bcd\.txt"/);
	});

	test("an upload takes a signal to cancel it", async () => {
		const controller = new AbortController();
		const { api, calls } = mock(() => json(200, { status: "success" }));
		await api.apps.commit("a1", new Uint8Array([1]), {
			signal: controller.signal,
		});
		await api.apps.create(new Uint8Array([1]), { signal: controller.signal });
		assert.equal(calls[0].init.signal, controller.signal);
		assert.equal(calls[1].init.signal, controller.signal);
	});

	test("zips above 100 MB fail before sending", async () => {
		const file = join(dir, "huge.zip");
		writeFileSync(file, "");
		truncateSync(file, 100 * 1024 * 1024 + 1); // sparse: nothing is allocated
		const { api, calls } = mock(() => ok());
		await assert.rejects(api.apps.create(file), {
			code: "FILE_TOO_LARGE",
			status: 0,
		});
		assert.equal(calls.length, 0);
	});
});
