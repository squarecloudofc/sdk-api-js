// Live suite (SDK-STANDARD 10.1): all 67 operations against the real API.
//
//   SQUARECLOUD_API_KEY=... pnpm test:live
//
// It CREATES AND DELETES real resources (an app, a database, a workspace) named
// `sdk-live-js-<base36 ms>`. Skipped when the key is absent; CI never runs it.
// The key and returned secrets (database password, certificate) are never printed.
// Run the JS, PY and GO suites one after another: they share the account's
// per-user rate limits (github-app 3/60 s, domains 10/5 min) and snapshot quota.
// Nothing external is configured: the custom domain is malformed (or "@"), the
// webhook token is fake, and the GitHub link targets a repository nobody installed.
// Needs Node >= 22.2 (zlib.crc32 builds the zip).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { crc32 } from "node:zlib";
import {
	type Snapshot,
	type SnapshotCreated,
	SquareCloudAPI,
	SquareCloudAPIError,
} from "../src/index.ts";

const KEY = process.env.SQUARECLOUD_API_KEY;
const PREFIX = "sdk-live-js-";
const NAME = `${PREFIX}${Date.now().toString(36)}`;
/** A well-formed id that exists nowhere: plan-gated steps run against it and assert a 4xx. */
const NO_ID = "0".repeat(32);
/** Plan, quota and scope refusals: success or one of these (reported as a skip). */
const GATED = new Set([
	"UPGRADE_REQUIRED",
	"upgrade_required",
	"INSUFFICIENT_MEMORY",
	"MISSING_SCOPE",
	// Per-owner daily snapshot quota (Hobby: 8), shared by apps, databases and every run
	"DAILY_SNAPSHOTS_LIMIT_REACHED",
	// Standard, Pro and Enterprise accounts that already hold their maximum
	"WORKSPACE_LIMIT_REACHED",
]);
/** Only these network failures are acceptable on an app without a domain (besides a 4xx). */
const NO_DOMAIN = new Set([
	"UNABLE_TO_FETCH_ANALYTICS",
	"UNABLE_TO_FETCH_ERRORS",
	"UNABLE_TO_FETCH_PERFORMANCE",
]);

// Every SDK-relevant operation of the pinned spec, literal paths first
// (`/apps/status` before `/apps/{appId}`), to check the run reached all of them
const spec = JSON.parse(
	readFileSync(new URL("../spec/openapi.json", import.meta.url), "utf8"),
);
const NOT_FOR_SDKS = ["GET /v2/openapi.json", "POST /v2/git/webhook/{webhook}"];
const operations = Object.entries(spec.paths as Record<string, object>)
	.flatMap(([template, item]) =>
		Object.keys(item).map((method) => ({
			key: `${method.toUpperCase()} ${template}`,
			method: method.toUpperCase(),
			regex: new RegExp(`^${template.replace(/\{[^}]+\}/g, "[^/]+")}$`),
			params: template.split("{").length,
		})),
	)
	.filter(({ key }) => !NOT_FOR_SDKS.includes(key))
	.sort((a, b) => a.params - b.params);
/** Operation → the HTTP statuses it answered (0: no response), reported at the end. */
const touched = new Map<string, Set<number>>();
/** Off during the sweep: its deletes do not count as exercised. */
let counting = true;

/**
 * One request every 2.1 s: hobby-1 allows 30 calls per 60 s per user and blocks
 * for 30 min past it (the same pace as the GO and PY suites). Wraps the `fetch`
 * option, so realtime opens, uploads and downloads are paced too, and records
 * the spec operation each request reaches.
 */
const PACE_MS = 2100;
let slot = 0;
const paced: typeof fetch = async (input, init) => {
	const now = Date.now();
	const delay = Math.max(0, slot - now);
	slot = now + delay + PACE_MS;
	if (delay) await wait(delay);
	const { pathname } = new URL(String(input));
	const method = init?.method ?? "GET";
	const op = operations.find(
		(op) => op.method === method && op.regex.test(pathname),
	);
	let statuses: Set<number> | undefined;
	if (op && counting) {
		statuses = touched.get(op.key) ?? new Set();
		touched.set(op.key, statuses);
	}
	try {
		const response = await fetch(input, init);
		statuses?.add(response.status);
		return response;
	} catch (error) {
		statuses?.add(0);
		throw error;
	}
};

type Log = { diagnostic(message: string): void };
type Check = (error: SquareCloudAPIError) => boolean;

const isError = (error: unknown, status: number, code: string) =>
	error instanceof SquareCloudAPIError &&
	error.status === status &&
	error.code === code;

/**
 * Test-only: on 429 KEEP_CALM wait 10 s and retry, at most 7 times (70 s, which
 * outlasts the 60 s per-user windows another SDK's suite may have just used).
 * The SDK itself never retries a 429.
 */
async function calm<T>(call: () => Promise<T>): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await call();
		} catch (error) {
			if (!isError(error, 429, "KEEP_CALM") || attempt >= 7) throw error;
			await wait(10_000);
		}
	}
}

/**
 * Deletes and cleanups: also waits out 403 RESTORE_IN_PROGRESS every 10 s for up
 * to 130 s (the API refuses to delete within 120 s of a restore).
 */
async function settled<T>(call: () => Promise<T>): Promise<T> {
	const deadline = Date.now() + 130_000;
	for (;;) {
		try {
			return await calm(call);
		} catch (error) {
			if (!isError(error, 403, "RESTORE_IN_PROGRESS") || Date.now() >= deadline)
				throw error;
			await wait(10_000);
		}
	}
}

/** Success, or `undefined` after a documented plan/quota/scope error (`skip <op>: <code>`). */
async function gated<T>(t: Log, op: string, call: () => Promise<T>) {
	try {
		return await calm(call);
	} catch (error) {
		if (!(error instanceof SquareCloudAPIError) || !GATED.has(error.code)) {
			throw error;
		}
		t.diagnostic(`skip ${op}: ${error.code}`);
	}
}

const is4xx: Check = (error) =>
	error.status >= 400 && error.status < 500 && error.status !== 429;

/** Asserts an API error that passes `check`. */
const rejectsWith = (call: () => Promise<unknown>, check: Check) =>
	assert.rejects(calm(call), (error) => {
		assert.ok(error instanceof SquareCloudAPIError, String(error));
		assert.ok(check(error), `unexpected ${error.status} ${error.code}`);
		return true;
	});

/** Asserts a 4xx API error (never a 429), optionally with this code. */
const rejects4xx = (call: () => Promise<unknown>, code?: string) =>
	rejectsWith(call, (error) => is4xx(error) && (!code || error.code === code));

/** Success, or an API error with one of these codes (routes whose outcome depends on the account). */
async function okOr<T>(call: () => Promise<T>, ...codes: string[]) {
	try {
		return await calm(call);
	} catch (error) {
		if (!(error instanceof SquareCloudAPIError) || !codes.includes(error.code))
			throw error;
	}
}

/** Deletes one resource; a 404 is fine, any other failure is recorded, never thrown. */
async function remove(t: Log, what: string, call: () => Promise<unknown>) {
	try {
		await settled(call);
	} catch (error) {
		if (error instanceof SquareCloudAPIError && error.status === 404) return;
		t.diagnostic(`cleanup failed: ${what}: ${(error as Error).message}`);
		leaks.push(what);
	}
}
const leaks: string[] = [];

/** A stored (uncompressed) zip, built in memory. */
function zip(files: Record<string, string>) {
	const encoder = new TextEncoder();
	const local: Buffer[] = [];
	const central: Buffer[] = [];
	let offset = 0;
	for (const [name, text] of Object.entries(files)) {
		const path = Buffer.from(name);
		const data = Buffer.from(encoder.encode(text));
		const crc = crc32(data);
		// Version, flags, method (stored), time, date (1980-01-01), crc, sizes, name length
		const fields = (header: Buffer, at: number) => {
			header.writeUInt16LE(20, at);
			header.writeUInt16LE(0, at + 2);
			header.writeUInt16LE(0, at + 4);
			header.writeUInt16LE(0, at + 6);
			header.writeUInt16LE(0x21, at + 8);
			header.writeUInt32LE(crc, at + 10);
			header.writeUInt32LE(data.length, at + 14);
			header.writeUInt32LE(data.length, at + 18);
			header.writeUInt16LE(path.length, at + 22);
		};
		const head = Buffer.alloc(30);
		head.writeUInt32LE(0x04034b50, 0);
		fields(head, 4);
		const entry = Buffer.alloc(46);
		entry.writeUInt32LE(0x02014b50, 0);
		entry.writeUInt16LE(20, 4);
		fields(entry, 6);
		entry.writeUInt32LE(offset, 42);
		local.push(head, path, data);
		central.push(entry, path);
		offset += head.length + path.length + data.length;
	}
	const directory = Buffer.concat(central);
	const end = Buffer.alloc(22);
	const count = Object.keys(files).length;
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(count, 8);
	end.writeUInt16LE(count, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return new Uint8Array(Buffer.concat([...local, directory, end]));
}

test("live: all 67 operations", {
	skip: !KEY && "SQUARECLOUD_API_KEY is not set",
}, async (t) => {
	const api = new SquareCloudAPI(KEY as string, { fetch: paced });
	const me = await calm(() => api.account.me());
	const web = me.user.plan.memory.available >= 512;
	/** Whether the app got a domain (the web variant of step 4). */
	let webApp = false;

	/** Downloads a whole snapshot and checks the zip magic ("PK\x03\x04"). */
	const downloaded = async (url: string) => {
		const stream = await api.downloadSnapshot(url);
		let size = 0;
		let head: number[] = [];
		for await (const chunk of stream) {
			if (!size) head = [...chunk.slice(0, 4)];
			size += chunk.length;
		}
		assert.deepEqual(head, [0x50, 0x4b, 0x03, 0x04], "zip header");
		assert.ok(size > 22, "zip size");
	};

	/**
	 * The newest listed snapshot. A pending one shows up within about 2 minutes,
	 * so an empty list is polled every 10 s for up to 3 minutes.
	 */
	const listed = async (
		created: SnapshotCreated | undefined,
		list: () => Promise<Snapshot[]>,
	) => {
		let snapshots = await calm(list);
		for (let i = 0; created && !snapshots.length && i < 18; i++) {
			await wait(10_000);
			snapshots = await calm(list);
		}
		if (created) assert.ok(snapshots.length, "no snapshot listed");
		for (const snapshot of snapshots) {
			assert.equal(typeof snapshot.name, "string");
			assert.equal(typeof snapshot.size, "number");
			assert.ok(snapshot.version_id, "version_id");
			assert.match(snapshot.url, /^https:\/\/\S+$/, "url");
		}
		return snapshots.sort(
			(a, b) => Date.parse(b.modified) - Date.parse(a.modified),
		)[0];
	};

	await t.test("sweep resources left by earlier runs", async (t) => {
		counting = false;
		for (const app of me.applications) {
			if (app.name.startsWith(PREFIX))
				await remove(t, `app ${app.id}`, () => api.apps.delete(app.id));
		}
		for (const db of me.databases) {
			if (db.name.startsWith(PREFIX))
				await remove(t, `database ${db.id}`, () => api.databases.delete(db.id));
		}
		for (const ws of await calm(() => api.workspaces.list())) {
			if (ws.name.startsWith(PREFIX) && ws.owner === me.user.id)
				await remove(t, `workspace ${ws.id}`, () =>
					api.workspaces.delete(ws.id),
				);
		}
		counting = true;
	});

	await t.test("1. read-only", async (t) => {
		const status = await calm(() => api.service.status());
		assert.equal(typeof status.status, "string");
		assert.equal(typeof me.user.id, "string");
		const snapshots = await gated(t, "account.snapshots", () =>
			api.account.snapshots(),
		);
		if (snapshots) assert.ok(Array.isArray(snapshots));
		assert.ok(Array.isArray(await calm(() => api.apps.statusAll())));
		assert.ok(Array.isArray(await calm(() => api.apps.domains())));
		const balancers = await calm(() => api.apps.loadBalancers());
		assert.equal(typeof balancers.limit, "number");
		assert.ok(Array.isArray(await calm(() => api.databases.statusAll())));
		assert.ok(Array.isArray(await calm(() => api.workspaces.list())));
		// 1 per 5 min per user: a recent run leaves it KEEP_CALM
		try {
			assert.equal(
				typeof (await api.workspaces.members.inviteCode()),
				"string",
			);
		} catch (error) {
			if (!(error instanceof SquareCloudAPIError) || error.code !== "KEEP_CALM")
				throw error;
			t.diagnostic("skip workspaces.members.inviteCode: KEEP_CALM");
		}
	});

	await t.test("2. error paths", async () => {
		await assert.rejects(api.apps.get(".."), {
			status: 0,
			code: "INVALID_ID",
		});
		await rejects4xx(() => api.apps.get(NO_ID), "APP_NOT_FOUND");
	});

	let appId = "";
	try {
		await t.test("3. app", async (t) => {
			const config = [
				`DISPLAY_NAME=${NAME}`,
				"MAIN=index.js",
				`MEMORY=${web ? 512 : 256}`,
				"VERSION=recommended",
				...(web ? [`SUBDOMAIN=${NAME}`] : []),
			].join("\n");
			const main = web
				? 'require("node:http").createServer((_, res) => res.end("ok")).listen(process.env.PORT || 80, () => console.log("listening"));'
				: 'setInterval(() => console.log("tick"), 1000);';
			const created = await calm(() =>
				// package.json is required for Node (400 INVALID_DEPENDENCY without it)
				api.apps.create(
					zip({
						"squarecloud.app": config,
						"package.json": "{}\n",
						"index.js": main,
					}),
				),
			);
			appId = created.id;
			assert.match(appId, /^[a-f0-9]{32}$/);

			const app = await calm(() => api.apps.get(appId));
			assert.equal(app.name, NAME);
			webApp = Boolean(app.domain);
			// The full `domain` host, as GET returns it, and the `cluster`
			assert.equal(created.domain, app.domain ?? undefined);
			assert.equal(created.cluster, app.cluster);
			// The account and the domain list see it
			const summary = (await calm(() => api.account.me())).applications.find(
				(a) => a.id === appId,
			);
			assert.equal(summary?.name, NAME);
			assert.equal(typeof summary?.ram, "number");
			if (webApp) {
				const domain = (await calm(() => api.apps.domains())).find(
					(d) => d.app_id === appId,
				);
				assert.equal(domain?.hostname, app.domain);
				assert.equal(domain?.type, "subdomain");
			}
			const status = await calm(() => api.apps.status(appId));
			assert.equal(typeof status.running, "boolean");
			const raw = await calm(() => api.apps.status(appId, { raw: true }));
			assert.equal(typeof raw.cpu, "number");
			assert.equal(typeof raw.ram, "number");
			assert.equal(typeof status.ram, "string");
			const logs = await okOr(() => api.apps.logs(appId), "LOGS_UNAVAILABLE");
			if (logs !== undefined) assert.equal(typeof logs, "string");
			assert.ok(Array.isArray(await calm(() => api.apps.metrics(appId))));

			await calm(() => api.apps.stop(appId));
			await calm(() => api.apps.start(appId));

			// Realtime across a restart. The cluster relays `system
			// REALTIME_DISCONNECTED` when the container goes down, which ends the
			// stream (SDK-STANDARD 6), so a stream that ended is reopened once the
			// restart returned: a logs/status event must follow the restart.
			const seen: string[] = [];
			let restarted = false;
			let after = false;
			/** Reads until a logs/status event after the restart, the stream's end, or `ms`. */
			const watch = async (ms: number) => {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), ms);
				try {
					for await (const event of api.apps.realtime(appId, {
						signal: controller.signal,
					})) {
						const name =
							event.event === "logs" || event.event === "status"
								? event.event
								: `${event.event}:${event.data.split(" |")[0].slice(0, 40)}`;
						if (seen.at(-1) !== name) seen.push(name);
						if (event.event === "status")
							assert.equal(typeof event.status, "object");
						if (event.event === "logs")
							assert.ok(["stdout", "stderr"].includes(event.stream));
						if (
							restarted &&
							(event.event === "logs" || event.event === "status")
						) {
							after = true;
							break;
						}
					}
				} finally {
					clearTimeout(timer);
				}
			};
			const opened = Date.now();
			const restart = wait(3000)
				.then(() => calm(() => api.apps.restart(appId)))
				.then(() => {
					restarted = true;
				});
			restart.catch(() => {}); // awaited below
			try {
				await watch(120_000);
			} finally {
				await restart;
			}
			if (!after) {
				seen.push("(reopened)");
				// One open per app every 5 s
				await wait(Math.max(0, 5500 - (Date.now() - opened)));
				await watch(60_000);
			}
			t.diagnostic(`realtime: ${seen.join(" > ")}`);
			assert.ok(after, "a logs/status event after the restart");

			assert.equal(
				(await calm(() => api.apps.envs.set(appId, { SDK_LIVE: "1" })))
					.SDK_LIVE,
				"1",
			);
			assert.equal((await calm(() => api.apps.envs.get(appId))).SDK_LIVE, "1");
			assert.deepEqual(
				await calm(() =>
					api.apps.envs.replace(appId, { SDK_LIVE: "2", OTHER: "x" }),
				),
				{ SDK_LIVE: "2", OTHER: "x" },
			);
			assert.deepEqual(
				await calm(() => api.apps.envs.delete(appId, ["OTHER"])),
				{ SDK_LIVE: "2" },
			);

			// UTF-8 text, binary (bytes 0-255, then invalid UTF-8 at random) and empty
			// files (text and bytes), each read back byte-exact
			const binary = new Uint8Array(64 * 1024);
			for (let i = 0; i < binary.length; i++)
				binary[i] = i < 256 ? i : (Math.random() * 256) | 0;
			const files: [string, string | Uint8Array, Uint8Array][] = [
				["/sdk-live.txt", "héllo 🌍\n", new TextEncoder().encode("héllo 🌍\n")],
				["/sdk-live.bin", binary, binary],
				["/sdk-live-empty.txt", "", new Uint8Array()],
				["/sdk-live-empty.bin", new Uint8Array(), new Uint8Array()],
			];
			for (const [path, content] of files)
				await calm(() => api.apps.files.write(appId, path, content));
			for (const [path, , bytes] of files)
				assert.deepEqual(
					await calm(() => api.apps.files.read(appId, path)),
					bytes,
					path,
				);
			const entries = await calm(() => api.apps.files.list(appId, "/"));
			const txt = entries.find((entry) => entry.name === "sdk-live.txt");
			assert.equal(txt?.type, "file");
			assert.equal(typeof txt?.size, "number");
			assert.equal(typeof txt?.lastModified, "number");
			assert.ok(Array.isArray(await calm(() => api.apps.files.list(appId))));
			await rejectsWith(
				() => api.apps.files.list(appId, "/sdk-live-missing"),
				(error) => isError(error, 404, "FILE_NOT_FOUND"),
			);
			await calm(() =>
				api.apps.files.move(appId, "/sdk-live.txt", "/sdk-live-moved.txt"),
			);
			assert.deepEqual(
				await calm(() => api.apps.files.read(appId, "/sdk-live-moved.txt")),
				files[0][2],
			);
			for (const path of [
				"/sdk-live-moved.txt",
				"/sdk-live.bin",
				"/sdk-live-empty.txt",
				"/sdk-live-empty.bin",
			])
				await calm(() => api.apps.files.delete(appId, path));
			const left = await calm(() => api.apps.files.list(appId, "/"));
			assert.ok(!left.some((entry) => entry.name.startsWith("sdk-live")));

			// Commit without path (a plain file lands at the root under `filename`),
			// then with one (a zip is unpacked there). 1 commit per 5 s per app.
			await calm(() =>
				api.apps.commit(appId, new TextEncoder().encode("// commit"), {
					filename: "sdk-live-commit.js",
				}),
			);
			await wait(5500);
			await calm(() =>
				api.apps.commit(appId, zip({ "inner.txt": "zipped" }), {
					path: "sdk-live-dir",
				}),
			);
			const root = await calm(() => api.apps.files.list(appId, "/"));
			assert.ok(root.some((entry) => entry.name === "sdk-live-commit.js"));
			assert.equal(
				new TextDecoder().decode(
					await calm(() =>
						api.apps.files.read(appId, "/sdk-live-dir/inner.txt"),
					),
				),
				"zipped",
			);

			const deploys = await calm(() => api.apps.deploys.list(appId));
			assert.ok(Array.isArray(deploys));
			for (const timeline of deploys) assert.ok(Array.isArray(timeline));
			const current = await calm(() => api.apps.deploys.current(appId));
			assert.equal(typeof current, "object");
			await rejects4xx(
				() => api.apps.deploys.setWebhook(appId, "invalid"),
				"INVALID_ACCESS_TOKEN",
			);
			// A well-formed fake token: stored on this app only, nothing is
			// configured on GitHub. Then removed with "@".
			const webhook = await calm(() =>
				api.apps.deploys.setWebhook(appId, `ghp_${"0".repeat(36)}`),
			);
			assert.match(webhook, /^https:\/\/\S+\/git\/webhook\/\S+$/);
			assert.equal(
				(await calm(() => api.apps.deploys.current(appId))).webhook,
				webhook,
			);
			assert.equal(
				await calm(() => api.apps.deploys.setWebhook(appId, "@")),
				"",
			);
			assert.equal(
				(await calm(() => api.apps.deploys.current(appId))).webhook,
				undefined,
			);
			// The account has no GitHub App installation
			await rejectsWith(
				() =>
					api.apps.deploys.linkGithubApp(
						appId,
						"squarecloudofc/does-not-exist",
						"main",
					),
				(error) => isError(error, 403, "GITHUB_NOT_CONNECTED"),
			);
			await rejects4xx(
				() => api.apps.deploys.unlinkGithubApp(appId),
				"GIT_NOT_CONFIGURED",
			);
		});

		await t.test("4. network", async (t) => {
			assert.ok(appId, "no app");
			const end = new Date();
			const start = new Date(end.getTime() - 24 * 3600 * 1000);
			const calls: [string, () => Promise<unknown>][] = [
				["analytics", () => api.apps.network.analytics(appId, start, end)],
				[
					"errors",
					() =>
						api.apps.network.errors(appId, start, end, { include_4xx: true }),
				],
				// Pro and Enterprise only: 403 UPGRADE_REQUIRED on the other plans
				["logs", () => api.apps.network.logs(appId, start, end)],
				["performance", () => api.apps.network.performance(appId, start, end)],
			];
			for (const [op, call] of calls) {
				if (!webApp) {
					// No domain: a 4xx (plan gate), or the edge query's 500 UNABLE_TO_FETCH_*
					await rejectsWith(
						call,
						(error) =>
							is4xx(error) ||
							(error.status === 500 && NO_DOMAIN.has(error.code)),
					);
				} else if (op === "logs" || op === "performance") {
					await gated(t, `apps.network.${op}`, call);
				} else await calm(call);
			}
			if (webApp)
				await okOr(() => api.apps.network.dns(appId), "NO_CUSTOM_DOMAIN");
			else await rejects4xx(() => api.apps.network.dns(appId));
			// The edge purge can fail upstream (500 PURGE_CACHE_FAILED): the call itself is what is checked
			await okOr(
				() => api.apps.network.purgeCache(appId),
				"PURGE_CACHE_FAILED",
			);
			// Never a well-formed domain: on a paid plan it is registered at Cloudflare.
			// A malformed one is rejected first (INVALID_DOMAIN) on every plan, and
			// "@" on an app without a custom domain only clears the field.
			await rejects4xx(
				() => api.apps.network.setDomain(appId, "not a domain"),
				"INVALID_DOMAIN",
			);
			await gated(t, "apps.network.setDomain", () =>
				api.apps.network.setDomain(appId, "@"),
			);
		});

		await t.test("5. snapshots", async (t) => {
			assert.ok(appId, "no app");
			const created = await gated(t, "apps.snapshots.create", () =>
				api.apps.snapshots.create(appId),
			);
			if (created?.pending === false) await downloaded(created.url);
			const latest = await listed(created, () =>
				api.apps.snapshots.list(appId),
			);
			if (latest) {
				const all = await gated(t, "account.snapshots", () =>
					api.account.snapshots({ scope: "applications" }),
				);
				if (all)
					assert.ok(
						all.some((s) => s.version_id === latest.version_id),
						"account.snapshots lists it",
					);
				await calm(() =>
					api.apps.snapshots.restore(appId, latest.name, latest.version_id),
				);
			} else {
				await rejects4xx(() =>
					api.apps.snapshots.restore(appId, "sdk-live-missing", "0"),
				);
			}
		});

		let workspaceId = "";
		try {
			await t.test("6. workspace", async (t) => {
				assert.ok(appId, "no app");
				const created = await gated(t, "workspaces.create", () =>
					api.workspaces.create(NAME),
				);
				// Without the plan for it, every call runs against a missing workspace (a 4xx)
				const id = created?.id ?? NO_ID;
				const either = (call: () => Promise<unknown>) =>
					created ? calm(call) : rejects4xx(call);
				if (created) {
					workspaceId = id;
					assert.equal(created.name, NAME);
					assert.equal((await calm(() => api.workspaces.get(id))).name, NAME);
				} else await rejects4xx(() => api.workspaces.get(id));
				await either(() => api.workspaces.apps.add(id, appId));
				if (created) {
					const ws = await calm(() => api.workspaces.get(id));
					assert.ok(ws.applications.some((app) => app.id === appId));
					assert.ok(ws.members.some((m) => m.group === "owner"));
					// The composite `<appId>-<workspaceId>` reaches the shared app
					assert.equal(
						(await calm(() => api.apps.get(`${appId}-${id}`))).id,
						appId,
					);
					const statuses = await calm(() =>
						api.apps.statusAll({ workspaceId: id }),
					);
					assert.ok(statuses.some((s) => s.id === appId));
				}
				await either(() => api.workspaces.apps.remove(id, appId));
				await rejects4xx(() =>
					api.workspaces.members.add(id, "invalid", "view"),
				);
				// An unknown member of an existing workspace is 404 MEMBER_NOT_FOUND
				const unknown = (call: () => Promise<unknown>) =>
					created
						? rejectsWith(call, (error) =>
								isError(error, 404, "MEMBER_NOT_FOUND"),
							)
						: rejects4xx(call);
				await unknown(() => api.workspaces.members.update(id, "0", "view"));
				await unknown(() => api.workspaces.members.remove(id, "0"));
				// The owner cannot leave
				await rejects4xx(() => api.workspaces.leave(id));
				const drop = () => api.workspaces.delete(id);
				await (created ? settled(drop) : rejects4xx(drop));
				workspaceId = "";
				// Minutes after the create, the first 5-min metric points may exist
				const points = await calm(() => api.apps.metrics(appId));
				for (const point of points) {
					assert.equal(typeof point.date, "string");
					assert.equal(typeof point.cpu, "number");
					assert.equal(typeof point.ram, "number");
					assert.ok(Array.isArray(point.net));
				}
				t.diagnostic(`apps.metrics: ${points.length} points`);
			});
		} finally {
			const id = workspaceId;
			if (id)
				await remove(t, `workspace ${id}`, () => api.workspaces.delete(id));
		}
	} finally {
		const id = appId;
		if (id) await remove(t, `app ${id}`, () => api.apps.delete(id));
	}

	let databaseId = "";
	try {
		await t.test("7. database", async (t) => {
			const created = await gated(t, "databases.create", () =>
				api.databases.create({
					name: NAME,
					type: "redis",
					version: "8",
					memory: 512,
				}),
			);
			// Without the plan for it, every call runs against a missing database (a 4xx)
			const id = created?.id ?? NO_ID;
			const either = (call: () => Promise<unknown>) =>
				created ? calm(call) : rejects4xx(call);
			if (created) {
				databaseId = id;
				assert.ok(created.password, "a password is returned once");
				assert.equal((await calm(() => api.databases.get(id))).name, NAME);
				const status = await calm(() => api.databases.status(id));
				assert.equal(typeof status.running, "boolean");
				const raw = await calm(() => api.databases.status(id, { raw: true }));
				assert.equal(typeof raw.cpu, "number");
				assert.ok(Array.isArray(await calm(() => api.databases.metrics(id))));
				await calm(() => api.databases.update(id, { name: `${NAME}-2` }));
				assert.equal(
					(await calm(() => api.databases.get(id))).name,
					`${NAME}-2`,
				);
				const certificate = await calm(() => api.databases.certificate(id));
				assert.ok(certificate.length > 0, "certificate");
				const password = await calm(() =>
					api.databases.resetCredentials(id, "password"),
				);
				assert.ok(password.length > 0, "new password");
				await wait(3100); // 1 reset per 3 s per user
				assert.equal(
					await calm(() => api.databases.resetCredentials(id, "certificate")),
					"",
				);
				assert.ok(
					(await calm(() => api.databases.statusAll())).some(
						(s) => s.id === id,
					),
				);
			} else {
				await rejects4xx(() => api.databases.get(id));
				await rejects4xx(() => api.databases.status(id));
				await rejects4xx(() => api.databases.status(id, { raw: true }));
				await rejects4xx(() => api.databases.metrics(id));
				await rejects4xx(() => api.databases.update(id, { name: `${NAME}-2` }));
				await rejects4xx(() => api.databases.certificate(id));
				await rejects4xx(() => api.databases.resetCredentials(id, "password"));
			}
			await either(() => api.databases.stop(id));
			await either(() => api.databases.start(id));
			if (created) {
				// Starting a running database: success, or a typed 409
				try {
					await calm(() => api.databases.start(id));
					t.diagnostic("databases.start again: ok");
				} catch (error) {
					const codes = ["CONTAINER_ALREADY_STARTED", "ACTION_FAILED"];
					if (!codes.some((code) => isError(error, 409, code))) throw error;
					t.diagnostic(
						`databases.start again: 409 ${(error as SquareCloudAPIError).code}`,
					);
				}
			}

			let latest: Snapshot | undefined;
			if (created) {
				const snapshot = await gated(t, "databases.snapshots.create", () =>
					api.databases.snapshots.create(id),
				);
				if (snapshot?.pending === false) await downloaded(snapshot.url);
				latest = await listed(snapshot, () => api.databases.snapshots.list(id));
			} else {
				await rejects4xx(() => api.databases.snapshots.create(id));
				await rejects4xx(() => api.databases.snapshots.list(id));
			}
			if (latest) {
				await calm(() =>
					api.databases.snapshots.restore(id, latest.name, latest.version_id),
				);
			} else {
				await rejects4xx(() =>
					api.databases.snapshots.restore(id, "sdk-live-missing", "0"),
				);
			}
			// Right after a restore: settled() waits out RESTORE_IN_PROGRESS (up to 130 s)
			const drop = () => api.databases.delete(id);
			await (created ? settled(drop) : rejects4xx(drop));
			databaseId = "";
		});
	} finally {
		const id = databaseId;
		if (id) await remove(t, `database ${id}`, () => api.databases.delete(id));
	}

	await t.test("8. AI", async (t) => {
		const completion = await gated(t, "ai.chat", () =>
			api.ai.chat({
				messages: [{ role: "user", content: "ping" }],
				max_tokens: 5,
			}),
		);
		if (completion) {
			assert.ok(completion.choices.length);
			assert.equal(typeof completion.model, "string");
			assert.equal(typeof completion.usage.total_tokens, "number");
		}
	});

	await t.test("account is left clean", async () => {
		counting = false;
		const after = await calm(() => api.account.me());
		const workspaces = await calm(() => api.workspaces.list());
		const left = [
			...after.applications.map((app) => `app ${app.id} ${app.name}`),
			...after.databases.map((db) => `database ${db.id} ${db.name}`),
			...workspaces.map((ws) => `workspace ${ws.id} ${ws.name}`),
		].filter((what) => what.includes(PREFIX));
		assert.deepEqual(left, [], "nothing with the prefix remains");
	});

	for (const { key } of operations)
		t.diagnostic(
			`op ${key}: ${[...(touched.get(key) ?? [])].join(" ") || "-"}`,
		);
	assert.deepEqual(leaks, [], "every resource was deleted");
	// Every operation was reached, by success or by an asserted error
	assert.equal(operations.length, 67);
	if (appId)
		assert.deepEqual(
			operations.filter(({ key }) => !touched.has(key)).map(({ key }) => key),
			[],
			"operations not exercised",
		);
});
