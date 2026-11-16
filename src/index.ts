/**
 * Official JavaScript SDK for the Square Cloud API.
 *
 * Create a client with your API key and call the API through its groups:
 *
 * ```ts
 * import { SquareCloudAPI } from "@squarecloud/api";
 *
 * const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY!);
 * const { user, applications } = await api.account.me();
 * await api.apps.restart(applications[0].id);
 * ```
 *
 * Every method returns plain data. When a call fails, it throws a
 * {@link SquareCloudAPIError} that carries the HTTP status and the API's error code.
 *
 * @packageDocumentation
 */
import pkg from "../package.json" with { type: "json" };
import { SquareCloudAPIError } from "./error.ts";
import type {
	Account,
	AnalyticsFilters,
	App,
	AppCreated,
	AppDomain,
	ChatCompletion,
	ChatRequest,
	Database,
	DatabaseCreate,
	DatabaseCreated,
	DatabaseUpdate,
	DateInput,
	DeployCurrent,
	DeployEvent,
	DNSRecord,
	EnvVars,
	FileContent,
	FileEntry,
	FileInput,
	LinkedRepository,
	LoadBalancers,
	MetricPoint,
	NetworkAnalytics,
	NetworkErrors,
	NetworkLog,
	NetworkPerformance,
	RealtimeEvent,
	RealtimeStatus,
	RuntimeStats,
	ServiceStatus,
	Snapshot,
	SnapshotCreated,
	SnapshotRestored,
	SnapshotRestoreState,
	SnapshotScope,
	SquareCloudAPIOptions,
	StatusListItem,
	Workspace,
	WorkspaceCreated,
	WorkspaceGroup,
} from "./types.ts";

// Inlined by the bundler: no runtime `process` access, however the build is run
const USER_AGENT = `squarecloud-sdk-js/${pkg.version}`;
/** The default base URL of the Square Cloud API, which the `baseUrl` option can replace. */
export const BASE_URL = "https://api.squarecloud.app/v2";
/** The size limit of each file that `apps.create()` and `apps.commit()` upload. */
const MAX_UPLOAD = 100 * 1024 * 1024;
/** Decoded content cap of `files.write`. */
const MAX_FILE = 10 * 1024 * 1024;
/** `files.write` content above this many bytes is an upload: no timeout. */
const LARGE_WRITE = 1024 * 1024;
/**
 * Timeout floor for calls the server holds open: a snapshot or restore answers 202
 * only at ~90 s, database provisioning and lifecycle actions take up to 95 s.
 */
const SLOW_MS = 120_000;
/** AI chat: the gateway answers 503 `server_overloaded` past its 90 s deadline for the whole request. */
const AI_MS = 120_000;
/** The API admits one realtime open per app every 5 s (`KEEP_CALM` otherwise), plus 0.5 s for skew. */
const REALTIME_PACE_MS = 5500;

type Query = Record<string, DateInput | boolean | undefined>;
type RequestOptions = {
	/** `undefined`, `""` and `false` values are not sent. */
	query?: Query;
	/** A value to serialize, or an already-serialized JSON string. */
	json?: unknown;
	/** Multipart upload: no timeout. */
	body?: FormData;
	/** Return the whole body instead of `response` (routes without the envelope). */
	raw?: boolean;
	/** Snapshot create/restore: a 202 is `{ pending: true }`, any other 2xx `{ pending: false, ...response }`. */
	pending?: boolean;
	/** Return the `Response` unread; the timeout only covers the headers (SSE). */
	stream?: boolean;
	/** A call the server holds open: wait at least this many ms (`SLOW_MS`, `AI_MS`). */
	floor?: number;
	/** No timeout (a large `files.write`). */
	untimed?: boolean;
	/** `path` is a presigned storage URL: no API key, no timeout, the `Response` unread. */
	presigned?: boolean;
	signal?: AbortSignal;
};

const e = encodeURIComponent;
// Empty, "." and ".." ids change the route: "" hits the parent (`apps/` lists),
// and dots survive encoding (WHATWG URL also reads %2E as a dot)
const BAD_SEGMENT = /(?:^|\/)(?:\.\.?)?(?:\/|$)/;

/**
 * Backoff without Retry-After (the API sends none): 500ms·2^n, jitter, capped at 8s.
 * Never shorter than `min` ms; ends early on abort.
 */
const sleep = (attempt: number, signal?: AbortSignal, min = 0) =>
	new Promise<void>((resolve) => {
		// An already-aborted signal never fires "abort" again
		if (signal?.aborted) return resolve();
		const done = () => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", done);
			resolve();
		};
		const backoff =
			Math.min(8000, 500 * 2 ** attempt) * (0.5 + Math.random() / 2);
		const timer = setTimeout(done, Math.max(min, backoff));
		signal?.addEventListener("abort", done, { once: true });
	});

/**
 * Only what is safe to repeat: a network error on GET, or a 503 the API rejects
 * before doing any work. 429 is never retried (`RATE_LIMITED` can be a 30-min block).
 * `DATABASE_UNAVAILABLE` can fire mid-handler, so a mutation may already be applied:
 * GET only (the caller may retry its own idempotent mutations).
 */
const retryable = (method: string, { status, code }: SquareCloudAPIError) =>
	status === 0
		? code === "NETWORK_ERROR" && method === "GET"
		: status === 503 &&
			(code === "UPLOAD_BUSY" ||
				code === "ANALYTICS_BUSY" ||
				(code === "DATABASE_UNAVAILABLE" && method === "GET"));

/**
 * Client for the Square Cloud API.
 *
 * The client groups the API by resource: {@link SquareCloudAPI.account},
 * {@link SquareCloudAPI.service}, {@link SquareCloudAPI.ai},
 * {@link SquareCloudAPI.apps}, {@link SquareCloudAPI.databases} and
 * {@link SquareCloudAPI.workspaces}. Every method takes ids first and returns
 * plain data.
 *
 * @example
 * ```ts
 * const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY!);
 * await api.apps.restart(appId);
 * ```
 */
export class SquareCloudAPI {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	// 0 when timeouts are disabled, which disables the 120-second floors too.
	private readonly timeoutMs: number;
	private readonly maxRetries: number;
	private readonly userAgent: string;
	private readonly fetch?: typeof fetch;

	/**
	 * Creates a client that authenticates every call with your API key.
	 *
	 * @param apiKey - Your API key. Create one at https://squarecloud.app/account/security.
	 * @param options - Optional settings for the base URL, timeouts, retries, the
	 * `User-Agent` header and the `fetch` function. See {@link SquareCloudAPIOptions}.
	 * @throws {TypeError} When `apiKey` is not a string, or is empty or only whitespace.
	 *
	 * @example
	 * ```ts
	 * const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY!, {
	 *   timeoutMs: 60_000,
	 * });
	 * ```
	 */
	constructor(apiKey: string, options: SquareCloudAPIOptions = {}) {
		if (typeof apiKey !== "string" || !apiKey.trim()) {
			throw new TypeError(
				"The API key is missing or empty. Create a key at https://squarecloud.app/account/security and pass it to new SquareCloudAPI().",
			);
		}
		this.apiKey = apiKey;
		this.baseUrl = `${(options.baseUrl ?? BASE_URL).replace(/\/+$/, "")}/`;
		const timeoutMs = options.timeoutMs ?? 30_000;
		// setTimeout fires at once past 2^31-1 ms: a larger value (Infinity) means none, like <= 0
		this.timeoutMs = timeoutMs > 0 && timeoutMs < 2 ** 31 ? timeoutMs : 0;
		this.maxRetries = options.maxRetries ?? 2; // negative: no retries
		this.userAgent = options.userAgent ?? USER_AGENT;
		this.fetch = options.fetch;
	}

	// Builds the error of a failure without a response (a local check or a dropped
	// stream), so its status is 0.
	private local(
		code: string,
		message: string,
		method: string,
		path: string,
		cause?: unknown,
	) {
		// Concatenated, not resolved: a rejected "apps/.." must not collapse to "/v2/"
		const base = new URL(this.baseUrl).pathname;
		return new SquareCloudAPIError(0, code, message, method, base + path, {
			cause,
		});
	}

	private async request<T>(
		method: string,
		path: string,
		{
			query,
			json,
			body,
			raw,
			pending,
			stream,
			floor = 0,
			untimed,
			presigned,
			signal,
		}: RequestOptions = {},
	): Promise<T> {
		if (!presigned && BAD_SEGMENT.test(path)) {
			throw this.local(
				"INVALID_ID",
				'The id is empty, "." or "..", so the request was not sent. Pass the id of the resource you want to reach.',
				method,
				path,
			);
		}
		const url = new URL(path, this.baseUrl);
		for (const key in query) {
			const value = query[key];
			if (value === undefined || value === "" || value === false) continue;
			url.searchParams.set(
				key,
				value instanceof Date ? value.toISOString() : String(value),
			);
		}
		// Presigned: the API key must never go to the storage host
		const headers: Record<string, string> = presigned
			? { "User-Agent": this.userAgent }
			: {
					Authorization: this.apiKey,
					"User-Agent": this.userAgent,
					Accept: stream ? "text/event-stream" : "application/json",
				};
		if (json !== undefined) headers["Content-Type"] = "application/json";
		const init: RequestInit = {
			method,
			headers,
			body:
				json === undefined
					? body
					: typeof json === "string"
						? json
						: JSON.stringify(json),
		};
		// A disabled timeout (0) disables the floors too
		const ms =
			body || untimed || presigned || !this.timeoutMs
				? 0
				: Math.max(this.timeoutMs, floor);
		const timed = ms > 0;

		for (let attempt = 0; ; attempt++) {
			let error: SquareCloudAPIError;
			// A clearable timer (not AbortSignal.timeout): a stream's ends at its headers
			const clock = new AbortController();
			const timer = timed
				? setTimeout(
						() =>
							clock.abort(
								new DOMException(
									`No response within ${ms} ms. Try again, or raise timeoutMs if the call needs more time.`,
									"TimeoutError",
								),
							),
						ms,
					)
				: undefined;
			init.signal = timed
				? signal
					? AbortSignal.any([signal, clock.signal])
					: clock.signal
				: signal;
			try {
				const response = await (this.fetch ?? fetch)(url, init);
				if ((stream || presigned) && response.ok) return response as T;
				const text = await response.text();
				// biome-ignore lint/suspicious/noExplicitAny: raw JSON, narrowed below
				let data: any;
				// The JSON.parse error of a non-JSON body: the `cause` of a 2xx decode failure
				let invalid: unknown;
				try {
					data = text ? JSON.parse(text) : undefined;
				} catch (cause) {
					invalid = cause;
				}
				const failed =
					!response.ok ||
					invalid !== undefined ||
					// Safety net: a relayed failure with HTTP 200 (older APIs did so on database start/stop);
					// a 202 is not one, whatever its envelope says: the server is still working
					(!raw && response.status !== 202 && data?.status === "error");
				if (!failed) {
					if (pending) {
						return (
							response.status === 202
								? { pending: true }
								: { pending: false, ...data?.response }
						) as T;
					}
					return (raw ? data : data?.response) as T;
				}
				// Square envelope {status, code, message} or, on the AI route, the OpenAI shape
				// {error: {message, type, param, code}} with lowercase codes (`code` may be null)
				// (`error: null` is not the AI dialect: typeof null is "object")
				const err =
					data?.error && typeof data.error === "object" ? data.error : data;
				const code = err?.code || err?.type;
				error = new SquareCloudAPIError(
					response.status,
					code || "UNKNOWN_ERROR",
					// With no code at all, such as a proxy page or S3 XML, the status is the only clue
					err?.message ||
						(code
							? undefined
							: response.ok && invalid !== undefined
								? `Invalid JSON in HTTP ${response.status} response`
								: `HTTP ${response.status}`),
					method,
					url.pathname,
					response.ok && invalid !== undefined ? { cause: invalid } : undefined,
				);
			} catch (cause) {
				if (signal?.aborted) throw cause;
				const timedOut = (cause as Error)?.name === "TimeoutError";
				error = new SquareCloudAPIError(
					0,
					timedOut ? "TIMEOUT" : "NETWORK_ERROR",
					(cause as Error)?.message,
					method,
					url.pathname,
					{ cause },
				);
			} finally {
				clearTimeout(timer);
			}
			if (attempt >= this.maxRetries || !retryable(method, error)) throw error;
			await sleep(attempt, signal);
			signal?.throwIfAborted();
		}
	}

	private async upload<T>(
		path: string,
		file: FileInput,
		fallbackName: string,
		{
			filename,
			query,
			signal,
		}: { filename?: string; query?: Query; signal?: AbortSignal } = {},
	) {
		let blob: Blob;
		if (typeof file === "string") {
			// Lazy import keeps non-Node bundles free of node:fs; the Blob streams from disk
			const { openAsBlob } = await import("node:fs");
			blob = (await openAsBlob(file)) as Blob;
			filename ??= file.split(/[\\/]/).pop();
		} else {
			blob = file instanceof Blob ? file : new Blob([file as BlobPart]);
			filename ??= (file as File).name;
		}
		// One wire format in all SDKs: the part is octet-stream whatever the File's own type
		// (slice is zero-copy and keeps a disk-backed Blob on disk)
		if (blob.type && blob.type !== "application/octet-stream") {
			blob = blob.slice(0, blob.size, "application/octet-stream");
		}
		if (blob.size > MAX_UPLOAD) {
			throw this.local(
				"FILE_TOO_LARGE",
				"The file is larger than the 100 MB upload limit. Leave dependency folders and build output out of the zip, or upload a smaller file.",
				"POST",
				path,
			);
		}
		const body = new FormData();
		// CR/LF stripped like PY/Go; FormData still escapes `"` as %22
		body.append("file", blob, filename?.replace(/[\r\n]/g, "") || fallbackName);
		return this.request<T>("POST", path, { body, query, signal });
	}

	private async *stream(
		appId: string,
		{ signal }: { signal?: AbortSignal } = {},
	): AsyncGenerator<RealtimeEvent, void, undefined> {
		const path = `apps/${e(appId)}/realtime`;
		let status: RealtimeStatus = {};
		// Consecutive failed connections: any log or status frame resets it
		let reconnects = 0;
		for (;;) {
			const openedAt = Date.now();
			let response: Response;
			try {
				// Throws before streaming on 429 REALTIME_MAX_CONNECTIONS, 404, ...
				response = await this.request<Response>("GET", path, {
					stream: true,
					signal,
				});
			} catch (error) {
				if (signal?.aborted) return;
				throw error;
			}
			let cause: unknown;
			try {
				let handoff = false;
				for await (const frame of sse(
					response.body as ReadableStream<BufferSource>,
				)) {
					if (frame.event === "logs") {
						reconnects = 0;
						// First char is the stream id: \u0001 stdout, \u0002 stderr
						const id = frame.data.charCodeAt(0);
						const prefixed = id === 1 || id === 2;
						yield {
							...frame,
							event: "logs",
							stream: id === 2 ? "stderr" : "stdout",
							line: prefixed ? frame.data.slice(1) : frame.data,
						};
					} else if (frame.event === "status") {
						reconnects = 0;
						// The first frame is full, later ones lean: merge to keep every field
						try {
							const next = JSON.parse(frame.data);
							// A string or array would spread its indices: malformed, keep the state
							if (typeof next === "object" && !Array.isArray(next)) {
								status = { ...status, ...next };
							}
						} catch {}
						yield { ...frame, event: "status", status };
					} else {
						// ponytail: the API only sends system/error here; anything new passes through as-is
						yield frame as RealtimeEvent;
						if (frame.event !== "system") continue;
						if (frame.data.startsWith("REALTIME_DISCONNECTED")) return;
						// The API gave up on its upstream and hands reconnection to the
						// client; it closes right after, so reopen at EOF (like PY/Go)
						if (frame.data.startsWith("REALTIME_RECONNECT")) handoff = true;
					}
				}
				if (!handoff) return; // A clean EOF, such as the 10-minute limit, ends the stream.
				cause = new Error("REALTIME_RECONNECT");
			} catch (error) {
				if (signal?.aborted) return;
				cause = error; // the socket dropped (deploys, shutdown)
			}
			if (++reconnects > 3) {
				throw this.local(
					"NETWORK_ERROR",
					String((cause as Error)?.message ?? cause),
					"GET",
					path,
					cause,
				);
			}
			await sleep(
				reconnects - 1,
				signal,
				REALTIME_PACE_MS - (Date.now() - openedAt),
			);
			if (signal?.aborted) return;
		}
	}

	// The snapshot methods, identical for applications and databases. The docs below
	// are what callers see on both `apps.snapshots` and `databases.snapshots`.
	private snapshots(base: "apps" | "databases") {
		return {
			/**
			 * Lists the snapshots of the application or database.
			 *
			 * @param id - The application or database id (see {@link SquareCloudAPI.apps}
			 * for workspace applications).
			 * @returns The snapshots. Each one carries the `name` and `version_id` that
			 * `restore()` takes, and a signed download `url` that is valid for 1 hour.
			 * @throws {SquareCloudAPIError} 503 `SNAPSHOTS_UNAVAILABLE` when snapshot storage
			 * cannot answer. Try again in about 30 seconds.
			 */
			list: async (id: string) =>
				(await this.request<Snapshot[]>("GET", `${base}/${e(id)}/snapshots`)) ??
				[],
			/**
			 * Creates a snapshot of the application or database.
			 *
			 * @param id - The application or database id (see {@link SquareCloudAPI.apps}
			 * for workspace applications).
			 * @returns `{ pending: false, url, key }` when the snapshot is ready, with a
			 * signed download `url` that is valid for 1 hour. An API key without the
			 * `snapshots:read` scope gets `url` and `key` as `""`. A large snapshot returns
			 * `{ pending: true }` while it is still being generated. It shows up in
			 * `list()` within about 2 minutes, so poll `list()` and do not call `create()`
			 * again.
			 * @throws {SquareCloudAPIError} 429 `DAILY_SNAPSHOTS_LIMIT_REACHED` when you have
			 * used your plan's daily snapshots, 409 `RESTORE_IN_PROGRESS` while a snapshot
			 * is being restored (try again when it ends), and 503
			 * `CLUSTER_MAINTENANCE_TRY_LATER` during maintenance (try again in a few
			 * minutes).
			 *
			 * @remarks You can create one snapshot every 3 minutes, and each one counts
			 * against your plan's daily snapshot quota. The call can take a while, so its
			 * timeout is never shorter than 120 seconds.
			 */
			create: async (id: string): Promise<SnapshotCreated> => {
				const created = await this.request<SnapshotCreated>(
					"POST",
					`${base}/${e(id)}/snapshots`,
					{ floor: SLOW_MS, pending: true },
				);
				// The API omits both fields for a key without snapshots:read, and the type
				// promises strings.
				return created.pending
					? created
					: { ...created, url: created.url ?? "", key: created.key ?? "" };
			},
			/**
			 * Restores the application or database from one of its snapshots.
			 *
			 * @param id - The application or database id (see {@link SquareCloudAPI.apps}
			 * for workspace applications).
			 * @param name - The `name` of a snapshot from `list()`.
			 * @param versionId - The `version_id` of the same snapshot.
			 * @returns `{ pending: false }` when the restore has finished. A restore that
			 * takes longer than about 90 seconds returns `{ pending: true }` and keeps
			 * running. Follow it with `restoreState()`, and do not call `restore()` again.
			 * @throws {SquareCloudAPIError} 400 `MISSING_PARAMETERS`, `INVALID_SNAPSHOT_ID`
			 * or `INVALID_VERSION_ID` when `name` or `versionId` is missing or invalid. A
			 * database can also answer 400 `SNAPSHOT_DATABASE_MISMATCH` when the snapshot
			 * is of another engine.
			 * @throws {SquareCloudAPIError} 404 `APP_NOT_FOUND`, `DATABASE_NOT_FOUND` or
			 * `SNAPSHOT_NOT_FOUND` when the resource or the snapshot does not exist. 404
			 * `SNAPSHOT_RESTORE_FAILED`, `SNAPSHOT_CORRUPT`, `RESTORE_INTERRUPTED` or
			 * `CONTAINER_NOT_FOUND` when the restore itself fails.
			 * @throws {SquareCloudAPIError} 409 `RESTORE_IN_PROGRESS` or
			 * `SNAPSHOT_IN_PROGRESS` while another restore or a snapshot is running (try
			 * again when it ends), 413 `PAYLOAD_TOO_LARGE`, and 503
			 * `CLUSTER_MAINTENANCE_TRY_LATER` during maintenance (try again in a few
			 * minutes).
			 *
			 * @remarks The call can take a while, so its timeout is never shorter than
			 * 120 seconds.
			 *
			 * @example
			 * ```ts
			 * const [latest] = await api.apps.snapshots.list(appId);
			 * const { pending } = await api.apps.snapshots.restore(
			 *   appId,
			 *   latest.name,
			 *   latest.version_id,
			 * );
			 * let { state } = await api.apps.snapshots.restoreState(appId);
			 * while (pending && (state === "queued" || state === "running")) {
			 *   await new Promise((resolve) => setTimeout(resolve, 10_000));
			 *   ({ state } = await api.apps.snapshots.restoreState(appId));
			 * }
			 * ```
			 */
			restore: (id: string, name: string, versionId: string) =>
				this.request<SnapshotRestored>(
					"POST",
					`${base}/${e(id)}/snapshots/restore`,
					{
						json: { snapshotId: name, versionId },
						floor: SLOW_MS,
						pending: true,
					},
				),
			/**
			 * Returns the progress of the latest snapshot restore.
			 *
			 * @param id - The application or database id (see {@link SquareCloudAPI.apps}
			 * for workspace applications).
			 * @returns The restore's `state`. It is `queued` or `running` while the restore
			 * runs, with the current `step`. It is `success` or `error` for 1 hour after
			 * the restore ends, with the failure `code` on `error`. It is `none` when there
			 * was no recent restore.
			 *
			 * @remarks You can call this up to 30 times a minute.
			 */
			restoreState: (id: string) =>
				this.request<SnapshotRestoreState>(
					"GET",
					`${base}/${e(id)}/snapshots/restore`,
				),
		};
	}

	// The metrics, status and start/stop/restart methods are identical for applications
	// and databases. Their public docs sit on the properties that use them. The server
	// holds start, stop and restart open until the container acts, hence the floor.
	private metrics(base: "apps" | "databases") {
		return (id: string, { range }: { range?: "24h" | "7d" } = {}) =>
			this.request<MetricPoint[]>("GET", `${base}/${e(id)}/metrics`, {
				query: { range },
			});
	}

	private stats(base: "apps" | "databases") {
		return <Raw extends boolean = false>(
			id: string,
			{ raw }: { raw?: Raw } = {},
		) =>
			this.request<RuntimeStats<Raw>>("GET", `${base}/${e(id)}/status`, {
				query: { rawData: raw },
			});
	}

	private action(base: "apps" | "databases", action: string) {
		return (id: string) =>
			this.request<void>("POST", `${base}/${e(id)}/${action}`, {
				floor: SLOW_MS,
			});
	}

	/**
	 * Downloads a snapshot as a stream, so you can write it to a file without holding
	 * it in memory.
	 *
	 * @param url - The signed `url` of a snapshot, from `snapshots.list()`,
	 * `snapshots.create()` or `account.snapshots()`. It is valid for 1 hour.
	 * @param options.signal - Cancels the download. Downloads have no timeout.
	 * @returns A stream of the snapshot's zip file.
	 * @throws {SquareCloudAPIError} `UNKNOWN_ERROR` with the HTTP status when the
	 * download fails, for example after the link has expired. Get a fresh link from
	 * `snapshots.list()`.
	 *
	 * @remarks The download never sends your API key, because the link carries its own
	 * signature.
	 *
	 * @example
	 * ```ts
	 * import { createWriteStream } from "node:fs";
	 * import { Writable } from "node:stream";
	 *
	 * const zip = await api.downloadSnapshot(snapshot.url);
	 * await zip.pipeTo(Writable.toWeb(createWriteStream("backup.zip")));
	 * ```
	 */
	async downloadSnapshot(
		url: string,
		{ signal }: { signal?: AbortSignal } = {},
	): Promise<ReadableStream<Uint8Array>> {
		// A bodiless 2xx (204) is an empty stream, never null
		return ((
			await this.request<Response>("GET", url, { presigned: true, signal })
		).body ?? new Blob().stream()) as ReadableStream<Uint8Array>;
	}

	/** Reads your account: your user, your plan and the snapshots you own. */
	readonly account = {
		/**
		 * Returns your user and plan, with the applications and databases your API key
		 * can see.
		 *
		 * @remarks An API key limited to specific resources sees only those
		 * applications and databases.
		 */
		me: () => this.request<Account>("GET", "users/me"),
		/**
		 * Lists the snapshots of all your applications, or of all your databases.
		 *
		 * @param options.scope - `"applications"` (the default) or `"databases"`.
		 * @returns The snapshots. Each one carries the `name` and `version_id` that
		 * `snapshots.restore()` takes, and a signed download `url` that is valid for
		 * 1 hour.
		 * @throws {SquareCloudAPIError} 402 `UPGRADE_REQUIRED` when the account has no
		 * active paid plan, 429 `RATE_LIMITED` after 3 calls in a minute, and 503
		 * `SNAPSHOTS_UNAVAILABLE` when snapshot storage cannot answer (try again in
		 * about 30 seconds).
		 */
		snapshots: async ({ scope }: { scope?: SnapshotScope } = {}) =>
			(await this.request<Snapshot[]>("GET", "users/snapshots", {
				query: { scope },
			})) ?? [],
	};

	/** Reads the public status of the Square Cloud platform. */
	readonly service = {
		/**
		 * Returns the platform's overall status, the health of each service, and any
		 * open maintenance or incident.
		 *
		 * @remarks This call works without a valid API key.
		 */
		status: () =>
			this.request<ServiceStatus>("GET", "service/status", { raw: true }),
	};

	/** Generates text with Square Cloud AI, which follows the OpenAI chat completions format. */
	readonly ai = {
		/**
		 * Generates a chat completion.
		 *
		 * @param request - The model, messages and options, in the OpenAI format.
		 * @returns The completion, in the OpenAI format.
		 * @throws {SquareCloudAPIError} Errors from this call carry the lowercase OpenAI
		 * code in `code`, or the error `type` when there is no code. For example, 401
		 * `access_denied` for an unknown API key, 403 `upgrade_required` on a plan
		 * without AI, 429 `rate_limit_exceeded` or `weekly_limit_reached` when you reach
		 * your plan's limits, and 503 `server_overloaded` when the completion takes
		 * longer than 90 seconds.
		 *
		 * @remarks Available on the Standard plan and above, with an API key that has the
		 * `ai:chat` scope. Streaming responses are not supported. The timeout of this
		 * call is never shorter than 120 seconds. You can retry `server_overloaded`
		 * yourself, but the SDK does not, because the request is not idempotent.
		 */
		chat: (request: ChatRequest) =>
			this.request<ChatCompletion>("POST", "ai/chat/completions", {
				json: request,
				raw: true,
				floor: AI_MS,
			}),
	};

	/**
	 * Deploys, controls and inspects your applications.
	 *
	 * Every application id in this group, including those of its `deploys`, `envs`,
	 * `files`, `snapshots` and `network` methods, can also be a composite id,
	 * `<appId>-<workspaceId>`, to act on an application that someone shared with you
	 * through a workspace. A call for an application that does not exist throws a
	 * {@link SquareCloudAPIError} with 404 `APP_NOT_FOUND`.
	 */
	readonly apps = {
		/**
		 * Deploys a new application from a zip file.
		 *
		 * The zip holds your code and a `squarecloud.app` or `squarecloud.config`
		 * configuration file.
		 *
		 * @param file - The zip, as a file path (Node.js, Deno and Bun), a `Blob` or
		 * `File`, or a `Uint8Array`. A path is streamed from disk.
		 * @param options.signal - Cancels the upload. Uploads have no timeout.
		 * @returns The new application's id, name, language and resources.
		 * @throws {SquareCloudAPIError} `FILE_TOO_LARGE` with status 0 when the zip is
		 * larger than 100 MB, before anything is sent. 400 `INSUFFICIENT_MEMORY` when
		 * your plan does not have enough free memory for the application.
		 *
		 * @example
		 * ```ts
		 * const { id } = await api.apps.create("./my-bot.zip");
		 * ```
		 */
		create: (file: FileInput, { signal }: { signal?: AbortSignal } = {}) =>
			this.upload<AppCreated>("apps", file, "app.zip", { signal }),
		/**
		 * Returns the application's name, language, memory, owner and domains.
		 *
		 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 */
		get: (appId: string) => this.request<App>("GET", `apps/${e(appId)}`),
		/**
		 * Deletes the application and releases its custom domain.
		 *
		 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @throws {SquareCloudAPIError} 409 `RESTORE_IN_PROGRESS` while a snapshot is
		 * being restored. Try again when it ends.
		 */
		delete: (appId: string) => this.request<void>("DELETE", `apps/${e(appId)}`),
		/**
		 * Returns whether each application your API key can see is running, with its
		 * CPU and memory usage.
		 *
		 * @param options.workspaceId - List only the applications shared in this
		 * workspace.
		 * @returns One item per application. `cpu` and `ram` are present only while
		 * the application runs.
		 * @throws {SquareCloudAPIError} 404 `WORKSPACE_NOT_FOUND` when no workspace has
		 * the id in `workspaceId`.
		 */
		statusAll: ({ workspaceId }: { workspaceId?: string } = {}) =>
			this.request<StatusListItem[]>("GET", "apps/status", {
				query: { workspaceId },
			}),
		/**
		 * Returns the application's current CPU, memory, network and storage usage.
		 *
		 * @param id - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @param options.raw - Return numbers instead of formatted strings such as
		 * `"120.4MB"`: CPU as a percentage, memory in MB, and storage and network in
		 * bytes.
		 * @returns The usage, whether the application is `running`, and
		 * `restoring: true` while a snapshot restore is queued or running.
		 * @throws {SquareCloudAPIError} 404 `WORKSPACE_NOT_FOUND` when the workspace of
		 * a composite id does not exist.
		 */
		status: this.stats("apps"),
		/**
		 * Starts the application.
		 *
		 * @param id - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @throws {SquareCloudAPIError} 409 `CONTAINER_ALREADY_STARTED` when the
		 * application is already running, and 409 `RESTORE_IN_PROGRESS` while a
		 * snapshot is being restored (try again when it ends). Other refusals are also
		 * 409 with only a code, such as `CONTAINER_TEMPORARILY_SUSPENDED`,
		 * `CONTAINER_INSUFFICIENT_DISK_SPACE` or `ACTION_FAILED`, so check `code`
		 * rather than `message`.
		 *
		 * @remarks The call waits for the application to start, so its timeout is
		 * never shorter than 120 seconds.
		 */
		start: this.action("apps", "start"),
		/**
		 * Stops the application.
		 *
		 * @param id - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @throws {SquareCloudAPIError} 409 `CONTAINER_ALREADY_STOPPED` when the
		 * application is already stopped, and 409 `RESTORE_IN_PROGRESS` while a
		 * snapshot is being restored (try again when it ends). Other refusals are also
		 * 409 with only a code, such as `ACTION_FAILED`, so check `code` rather than
		 * `message`.
		 *
		 * @remarks The call waits for the application to stop, so its timeout is never
		 * shorter than 120 seconds.
		 */
		stop: this.action("apps", "stop"),
		/**
		 * Restarts the application.
		 *
		 * @param id - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @throws {SquareCloudAPIError} 409 `RESTORE_IN_PROGRESS` while a snapshot is
		 * being restored (try again when it ends). Other refusals are also 409 with
		 * only a code, such as `CONTAINER_TEMPORARILY_SUSPENDED` or `ACTION_FAILED`, so
		 * check `code` rather than `message`.
		 *
		 * @remarks The call waits for the application to restart, so its timeout is
		 * never shorter than 120 seconds.
		 */
		restart: this.action("apps", "restart"),
		/**
		 * Returns the application's most recent log output.
		 *
		 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @returns The recent standard output and standard error, combined in order,
		 * or `""` when there is none.
		 *
		 * @remarks This is a short snapshot of recent output, not a stream. Use
		 * `realtime()` to follow the logs live.
		 */
		logs: async (appId: string) =>
			(
				await this.request<{ logs?: string } | undefined>(
					"GET",
					`apps/${e(appId)}/logs`,
				)
			)?.logs ?? "",
		/**
		 * Returns the application's CPU, memory, network and disk usage over time,
		 * newest point first.
		 *
		 * @param id - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @param options.range - `"24h"` (the default) returns the last 24 hours, one
		 * point every 5 minutes, or every 10 minutes for applications under 512 MB.
		 * `"7d"` returns the last 7 days, one point an hour with the hour's average and
		 * its `cpu_max` and `ram_max` peaks.
		 * @throws {SquareCloudAPIError} 400 `INVALID_PARAMETERS` when `range` is not
		 * `"24h"` or `"7d"`.
		 *
		 * @remarks `"7d"` needs a Pro or Enterprise plan and at least 512 MB. Other
		 * plans and smaller applications get the 24-hour answer without an error, so
		 * check the points you got rather than the range you asked for.
		 */
		metrics: this.metrics("apps"),
		/**
		 * Streams the application's live logs, status and system events.
		 *
		 * Iterate the result with `for await`. A status event carries the full state in
		 * `event.status`, even when the API sends only the fields that changed. When the
		 * connection drops, or the API asks the client to reconnect, the stream reopens
		 * on its own, up to 3 times in a row.
		 *
		 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @param options.signal - Ends the stream. Aborting ends the loop without
		 * throwing.
		 * @returns An async iterable of {@link RealtimeEvent}.
		 * @throws {SquareCloudAPIError} 429 `REALTIME_MAX_CONNECTIONS` before the first
		 * event when you already have 5 streams open, or 429
		 * `REALTIME_MAX_CONNECTIONS_APP` when the application already has 30.
		 * `NETWORK_ERROR` with status 0 when
		 * the stream has to reopen more than 3 times in a row without a log or status
		 * event in between.
		 *
		 * @remarks The loop ends when the server closes the stream after 10 minutes,
		 * when the API sends `REALTIME_DISCONNECTED`, or when you `break` or abort. You
		 * can have at most 5 streams open at once, and an application at most 30.
		 * Opening the stream has the normal timeout, but reading it has none.
		 *
		 * @example
		 * ```ts
		 * const controller = new AbortController();
		 * for await (const event of api.apps.realtime(appId, {
		 *   signal: controller.signal,
		 * })) {
		 *   if (event.event === "logs") console.log(event.stream, event.line);
		 * }
		 * ```
		 */
		realtime: (appId: string, options?: { signal?: AbortSignal }) =>
			this.stream(appId, options),
		/**
		 * Lists the default and custom domains of all your applications.
		 *
		 * @returns One item per hostname, with the application id and whether it is
		 * the default `subdomain` or a `custom` domain. Applications without a domain
		 * are left out.
		 */
		domains: () => this.request<AppDomain[]>("GET", "apps/domains"),
		/**
		 * Lists your custom domains with the applications that serve each one.
		 *
		 * @returns The domains, and `limit`, the number of applications that can share
		 * one domain on your plan. A domain served by two or more applications
		 * balances traffic across them.
		 */
		loadBalancers: () =>
			this.request<LoadBalancers>("GET", "apps/load-balancers"),
		/**
		 * Uploads a file into the application.
		 *
		 * A `.zip` is unpacked at `path`. Any other file is written to
		 * `path/<filename>`.
		 *
		 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
		 * workspace applications).
		 * @param file - The file, as a path (Node.js, Deno and Bun), a `Blob` or
		 * `File`, or a `Uint8Array`. A path is streamed from disk.
		 * @param options.path - The destination directory. The default is the
		 * application root.
		 * @param options.filename - The name to upload the file as. The default is the
		 * file's own name, or `commit.zip` when it has none.
		 * @param options.signal - Cancels the upload. Uploads have no timeout.
		 * @throws {SquareCloudAPIError} `FILE_TOO_LARGE` with status 0 when the file is
		 * larger than 100 MB, before anything is sent. 403 `BLOCKED_PATH` when a
		 * workspace Maintainer sends one of the application's restricted files, such
		 * as an `.env` file or the configuration file.
		 */
		commit: (
			appId: string,
			file: FileInput,
			{
				path,
				filename,
				signal,
			}: { path?: string; filename?: string; signal?: AbortSignal } = {},
		) =>
			this.upload<void>(`apps/${e(appId)}/commit`, file, "commit.zip", {
				filename,
				query: { path },
				signal,
			}),

		/**
		 * Sets up deploys from Git, through a GitHub webhook or the Square Cloud GitHub
		 * App, and lists past deploys.
		 */
		deploys: {
			/**
			 * Sets up deploys on push through a GitHub webhook, or removes the webhook.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param accessToken - A GitHub personal access token, or `"@"` to remove the
			 * webhook.
			 * @returns The webhook URL, or `""` after a removal.
			 * @throws {SquareCloudAPIError} 400 `INVALID_ACCESS_TOKEN` when the token is
			 * not a valid GitHub personal access token.
			 */
			setWebhook: async (appId: string, accessToken: string) =>
				(
					await this.request<{ webhook?: string } | undefined>(
						"POST",
						`apps/${e(appId)}/deploy/webhook`,
						{ json: { access_token: accessToken } },
					)
				)?.webhook ?? "",
			/**
			 * Links a GitHub repository and branch to the application through the Square
			 * Cloud GitHub App, so that a push to the branch deploys it.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param repository - The repository's full name, such as
			 * `"octocat/hello-world"`.
			 * @param branch - The branch to deploy, at most 256 characters.
			 * @returns The linked repository's GitHub id, full name and branch.
			 * @throws {SquareCloudAPIError} 403 `GITHUB_NOT_CONNECTED` when your Square
			 * Cloud account has no connected GitHub account. 403
			 * `REPOSITORY_NOT_AVAILABLE` when the repository is not in a GitHub App
			 * installation of that GitHub account, and 403
			 * `REPOSITORY_PERMISSION_REQUIRED` when that account has no write access to
			 * the repository.
			 * @throws {SquareCloudAPIError} 400 `GIT_ALREADY_CONFIGURED` when the
			 * application is already linked, so unlink it first with
			 * `unlinkGithubApp()`. 409 `REPOSITORY_BRANCH_ALREADY_CONFIGURED` when
			 * another application, of any account, already links this repository and
			 * branch. The other application's id appears in `message` only when that
			 * application is yours.
			 * @throws {SquareCloudAPIError} 502 `FAILED_TO_FETCH` when GitHub did not
			 * confirm the branch. It is safe to try again.
			 *
			 * @remarks Needs an API key with the `apps:deploy` scope. Linking and
			 * unlinking share a limit of 3 calls a minute.
			 */
			linkGithubApp: async (
				appId: string,
				repository: string,
				branch: string,
			) =>
				(
					await this.request<{ repository?: LinkedRepository } | undefined>(
						"POST",
						`apps/${e(appId)}/deploy/github-app`,
						{
							json: { repositoryName: repository, repositoryBranch: branch },
						},
					)
				)?.repository ?? ({} as LinkedRepository),
			/**
			 * Removes the application's GitHub App link, so pushes no longer deploy it.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @throws {SquareCloudAPIError} 400 `GIT_NOT_CONFIGURED` when the application
			 * has no GitHub App link.
			 *
			 * @remarks Needs an API key with the `apps:deploy` scope. Linking and
			 * unlinking share a limit of 3 calls a minute.
			 */
			unlinkGithubApp: (appId: string) =>
				this.request<void>("DELETE", `apps/${e(appId)}/deploy/github-app`),
			/**
			 * Lists the application's recent Git deploys.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @returns One timeline per deploy, each ordered from the oldest event to the
			 * newest. A failed deploy ends in an event with `state: "error"` and a
			 * `code`, plus a `message` when there are details.
			 */
			list: (appId: string) =>
				this.request<DeployEvent[][]>("GET", `apps/${e(appId)}/deployments`),
			/**
			 * Returns how Git deploys are set up for the application.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @returns `app` with the GitHub App link and `webhook` with the webhook URL,
			 * each only when it is set up, or `{}` when neither is.
			 */
			current: async (appId: string) =>
				(await this.request<DeployCurrent | undefined>(
					"GET",
					`apps/${e(appId)}/deployments/current`,
				)) ?? {},
		},

		/**
		 * Reads and changes the application's environment variables.
		 *
		 * Static applications have no environment variables, so every method of this
		 * group throws 400 `STATIC_APP_ENV_NOT_SUPPORTED` for them.
		 */
		envs: {
			/**
			 * Returns the application's environment variables.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @returns An object that maps each variable name to its value.
			 */
			get: (appId: string) =>
				this.request<EnvVars>("GET", `apps/${e(appId)}/envs`),
			/**
			 * Adds or updates the given environment variables and keeps the others.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param envs - The variables to add or update, as names mapped to values.
			 * @returns Every variable of the application after the change. An API key
			 * without the `envs:read` scope gets back only the variables it sent.
			 * @throws {SquareCloudAPIError} 400 `TOO_MANY_ENV_VARS` when the application
			 * would have more than 256 variables, and 409 `ENV_BUSY` when another request
			 * is changing the variables (try again in a moment).
			 */
			set: (appId: string, envs: EnvVars) =>
				this.request<EnvVars>("POST", `apps/${e(appId)}/envs`, {
					json: { envs },
				}),
			/**
			 * Replaces all the application's environment variables with the given ones.
			 * Variables you leave out are deleted.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param envs - The complete new set of variables. Pass `{}` to delete them
			 * all.
			 * @returns The variables after the change.
			 * @throws {SquareCloudAPIError} 400 `TOO_MANY_ENV_VARS` when `envs` has more
			 * than 256 variables, and 409 `ENV_BUSY` when another request is changing the
			 * variables (try again in a moment).
			 */
			replace: (appId: string, envs: EnvVars) =>
				this.request<EnvVars>("PUT", `apps/${e(appId)}/envs`, {
					json: { envs },
				}),
			/**
			 * Deletes the given environment variables. Names that do not exist are
			 * ignored.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param keys - The names of the variables to delete.
			 * @returns The variables that remain. An API key without the `envs:read`
			 * scope gets `{}`.
			 * @throws {SquareCloudAPIError} 409 `ENV_BUSY` when another request is
			 * changing the variables. Try again in a moment.
			 */
			delete: (appId: string, keys: string[]) =>
				this.request<EnvVars>("DELETE", `apps/${e(appId)}/envs`, {
					json: { envs: keys },
				}),
		},

		/**
		 * Lists, reads, writes, moves and deletes the application's files.
		 *
		 * Paths are absolute, such as `"/src/index.js"`, and at most 256 characters
		 * long. Listing or writing a path you have no access to throws 403
		 * `BLOCKED_PATH`.
		 */
		files: {
			/**
			 * Lists the files and directories in a directory of the application.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param path - The directory to list. The default is the application root.
			 * @throws {SquareCloudAPIError} 404 `FILE_NOT_FOUND` when the directory does
			 * not exist.
			 */
			list: (appId: string, path?: string) =>
				this.request<FileEntry[]>("GET", `apps/${e(appId)}/files`, {
					query: { path },
				}),
			/**
			 * Reads a file of the application.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param path - The path of the file.
			 * @returns The file's bytes. Decode text with `new TextDecoder().decode()`.
			 * @throws {SquareCloudAPIError} 404 `FILE_NOT_FOUND` when the file does not
			 * exist, and 413 `FILE_TOO_LARGE` when it is larger than 10 MB.
			 */
			read: async (appId: string, path: string) =>
				fromBase64(
					(
						await this.request<{ data?: string } | undefined>(
							"GET",
							`apps/${e(appId)}/files/content`,
							{ query: { path, encoding: "base64" } },
						)
					)?.data ?? "",
				),
			/**
			 * Creates or replaces a file of the application.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param path - The path of the file.
			 * @param content - The new content. A string is written as text, and a
			 * `Uint8Array` is written byte for byte. Empty content creates an empty file.
			 * @param options.signal - Cancels the write.
			 * @throws {SquareCloudAPIError} `FILE_TOO_LARGE` with status 0 when the content
			 * is larger than 10 MB, before anything is sent. Upload larger files with
			 * `apps.commit()`.
			 *
			 * @remarks Content larger than 1 MiB is sent like an upload, without a
			 * timeout, so pass a `signal` if you need to cancel it.
			 */
			write: async (
				appId: string,
				path: string,
				content: FileContent,
				{ signal }: { signal?: AbortSignal } = {},
			) => {
				// Decoded bytes. A UTF-16 unit is at most 3 UTF-8 bytes: a string is only
				// measured when it could pass the 1 MiB untimed threshold
				const size =
					typeof content !== "string"
						? content.length
						: content.length * 3 > LARGE_WRITE
							? new TextEncoder().encode(content).length
							: 0;
				if (size > MAX_FILE) {
					throw this.local(
						"FILE_TOO_LARGE",
						"The content is larger than the 10 MB file write limit, so it was not sent. Upload larger files with apps.commit().",
						"PUT",
						`apps/${e(appId)}/files`,
					);
				}
				await this.request("PUT", `apps/${e(appId)}/files`, {
					json:
						typeof content === "string"
							? { path, content }
							: { path, content: toBase64(content), encoding: "base64" },
					// Up to ~13 MB on the wire: a large write is an upload, with no timeout
					untimed: size > LARGE_WRITE,
					signal,
				});
			},
			/**
			 * Moves or renames a file of the application.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param path - The current path of the file.
			 * @param to - The new path.
			 */
			move: (appId: string, path: string, to: string) =>
				this.request<void>("PATCH", `apps/${e(appId)}/files`, {
					json: { path, to },
				}),
			/**
			 * Deletes a file of the application.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param path - The path of the file.
			 */
			delete: (appId: string, path: string) =>
				this.request<void>("DELETE", `apps/${e(appId)}/files`, {
					json: { path },
				}),
		},

		/** Creates, lists and restores the application's snapshots. */
		snapshots: this.snapshots("apps"),

		/**
		 * Reads the traffic of the application's website and manages its custom domain.
		 *
		 * These methods work only for websites. A time window runs from `start` to
		 * `end`, each an ISO 8601 string or a `Date`. The API keeps 7 days of traffic,
		 * so a window reaches back at most 7 days. `analytics()`, `errors()`, `logs()`
		 * and `performance()` share a limit of 20 calls a minute for data that is not
		 * cached, and past it they throw 429 `RATE_LIMITED`.
		 */
		network: {
			/**
			 * Returns the website's traffic in a time window, broken down by country,
			 * device, browser, path, status code and more.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param start - The start of the window.
			 * @param end - The end of the window.
			 * @param filters - Narrows every breakdown to the matching traffic. Each
			 * filter takes the exact `type` value of an item in its breakdown, and
			 * filters combine.
			 * @returns The breakdowns, or `null` when the window has no traffic.
			 * @throws {SquareCloudAPIError} 400 `INVALID_FILTER` when a filter value has
			 * the wrong format.
			 */
			analytics: async (
				appId: string,
				start: DateInput,
				end: DateInput,
				filters?: AnalyticsFilters,
			) =>
				orNull(
					await this.request<NetworkAnalytics | object>(
						"GET",
						`apps/${e(appId)}/network/analytics`,
						{ query: { start, end, ...filters } },
					),
				),
			/**
			 * Returns the HTTP errors the website served in a time window, by status,
			 * path and method.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param start - The start of the window.
			 * @param end - The end of the window.
			 * @param options.include_4xx - Count 4xx responses too. By default only 5xx
			 * responses are counted.
			 * @returns The error breakdown, or `null` when the window has no traffic.
			 */
			errors: async (
				appId: string,
				start: DateInput,
				end: DateInput,
				{ include_4xx }: { include_4xx?: boolean } = {},
			) =>
				orNull(
					await this.request<NetworkErrors | object>(
						"GET",
						`apps/${e(appId)}/network/errors`,
						{ query: { start, end, include_4xx } },
					),
				),
			/**
			 * Returns one log entry for each request the website received in a time
			 * window.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param start - The start of the window.
			 * @param end - The end of the window.
			 * @throws {SquareCloudAPIError} 403 `UPGRADE_REQUIRED` on plans other than Pro
			 * and Enterprise.
			 */
			logs: (appId: string, start: DateInput, end: DateInput) =>
				this.request<NetworkLog[]>("GET", `apps/${e(appId)}/network/logs`, {
					query: { start, end },
				}),
			/**
			 * Returns the website's response times in a time window: the 50th, 95th and
			 * 99th percentiles at the edge and at your application, by country, edge
			 * location and path.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param start - The start of the window.
			 * @param end - The end of the window.
			 * @returns The percentiles in milliseconds, or `null` when the window has no
			 * traffic.
			 * @throws {SquareCloudAPIError} 403 `UPGRADE_REQUIRED` on plans other than Pro
			 * and Enterprise.
			 */
			performance: async (appId: string, start: DateInput, end: DateInput) =>
				orNull(
					await this.request<NetworkPerformance | object>(
						"GET",
						`apps/${e(appId)}/network/performance`,
						{ query: { start, end } },
					),
				),
			/**
			 * Returns the DNS records to create at your domain registrar, so the custom
			 * domain can be verified and get its SSL certificate.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @returns The records, each with its `status`. A record that is not active
			 * yet can carry up to 3 validation `errors`.
			 * @throws {SquareCloudAPIError} 400 `NO_CUSTOM_DOMAIN` when the application
			 * has no custom domain. Set one first with `setDomain()`.
			 */
			dns: (appId: string) =>
				this.request<DNSRecord[]>("GET", `apps/${e(appId)}/network/dns`),
			/**
			 * Sets the application's custom domain, or removes it.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 * @param domain - A fully qualified domain name, such as `"example.com"`, or
			 * `"@"` to remove the custom domain.
			 * @throws {SquareCloudAPIError} 403 `UPGRADE_REQUIRED` on plans other than
			 * Standard, Pro and Enterprise. 400 `RESERVED_DOMAIN` for a Square Cloud
			 * domain, and 409 `DOMAIN_ALREADY_EXISTS` when another account uses the
			 * domain. 403 `LOAD_BALANCER_LIMIT_REACHED` when the domain is already on as
			 * many of your applications as your plan allows.
			 *
			 * @remarks Setting the same domain on several of your applications balances
			 * traffic across them. See `apps.loadBalancers()`.
			 */
			setDomain: (appId: string, domain: string) =>
				this.request<void>("POST", `apps/${e(appId)}/network/custom`, {
					json: { custom: domain },
				}),
			/**
			 * Clears the edge cache of the website's domains, so the next requests reach
			 * your application.
			 *
			 * @param appId - The application id (see {@link SquareCloudAPI.apps} for
			 * workspace applications).
			 */
			purgeCache: (appId: string) =>
				this.request<void>("POST", `apps/${e(appId)}/network/purge_cache`),
		},
	};

	/**
	 * Creates, controls and inspects your databases.
	 *
	 * A call for a database that does not exist throws a {@link SquareCloudAPIError}
	 * with 404 `DATABASE_NOT_FOUND`.
	 */
	readonly databases = {
		/**
		 * Creates a database.
		 *
		 * @param database - The name, engine (`type`), engine version and memory of the
		 * new database.
		 * @returns The new database with its connection URL and password. Store the
		 * password now, because only this call and `resetCredentials()` return it.
		 * @throws {SquareCloudAPIError} 403 `UPGRADE_REQUIRED` on plans other than
		 * Standard, Pro and Enterprise. 400 `INVALID_MEMORY` when `memory` is not a
		 * whole number of MB, and 400 `INSUFFICIENT_MEMORY` when your plan does not
		 * have enough free memory.
		 *
		 * @remarks The call waits for the database to be created, so its timeout is
		 * never shorter than 120 seconds.
		 *
		 * @example
		 * ```ts
		 * const db = await api.databases.create({
		 *   name: "main",
		 *   type: "postgres",
		 *   version: "17",
		 *   memory: 1024,
		 * });
		 * console.log(db.connection_url);
		 * ```
		 */
		create: (database: DatabaseCreate) =>
			this.request<DatabaseCreated>("POST", "databases", {
				json: database,
				floor: SLOW_MS,
			}),
		/**
		 * Returns the database's name, engine, memory, port and owner.
		 *
		 * @param databaseId - The database id.
		 */
		get: (databaseId: string) =>
			this.request<Database>("GET", `databases/${e(databaseId)}`),
		/**
		 * Renames the database or changes its memory.
		 *
		 * @param databaseId - The database id.
		 * @param changes - The new `name`, the new `ram` in MB, or both.
		 * @throws {SquareCloudAPIError} 400 `NO_UPDATE_DATA` when `changes` has neither
		 * field.
		 */
		update: (databaseId: string, changes: DatabaseUpdate) =>
			this.request<void>("PATCH", `databases/${e(databaseId)}`, {
				json: changes,
			}),
		/**
		 * Deletes the database.
		 *
		 * @param databaseId - The database id.
		 * @throws {SquareCloudAPIError} 409 `RESTORE_IN_PROGRESS` while a snapshot is
		 * being restored. Try again when it ends.
		 */
		delete: (databaseId: string) =>
			this.request<void>("DELETE", `databases/${e(databaseId)}`),
		/**
		 * Starts the database.
		 *
		 * @param id - The database id.
		 * @throws {SquareCloudAPIError} 409 `CONTAINER_ALREADY_STARTED` when the
		 * database is already running, and 409 `RESTORE_IN_PROGRESS` while a snapshot
		 * is being restored (try again when it ends). Other refusals are also 409 with
		 * only a code, such as `ACTION_FAILED`, so check `code` rather than `message`.
		 *
		 * @remarks The call waits for the database to start, so its timeout is never
		 * shorter than 120 seconds.
		 */
		start: this.action("databases", "start"),
		/**
		 * Stops the database.
		 *
		 * @param id - The database id.
		 * @throws {SquareCloudAPIError} 409 `CONTAINER_ALREADY_STOPPED` when the
		 * database is already stopped, and 409 `RESTORE_IN_PROGRESS` while a snapshot
		 * is being restored (try again when it ends). Other refusals are also 409 with
		 * only a code, such as `ACTION_FAILED`, so check `code` rather than `message`.
		 *
		 * @remarks The call waits for the database to stop, so its timeout is never
		 * shorter than 120 seconds.
		 */
		stop: this.action("databases", "stop"),
		/**
		 * Returns the database's current CPU, memory, network and storage usage.
		 *
		 * @param id - The database id.
		 * @param options.raw - Return numbers instead of formatted strings such as
		 * `"120.4MB"`: CPU as a percentage, memory in MB, and storage and network in
		 * bytes.
		 * @returns The usage, whether the database is `running`, and `restoring: true`
		 * while a snapshot restore is queued or running.
		 */
		status: this.stats("databases"),
		/**
		 * Returns the database's CPU, memory, network and disk usage over time, newest
		 * point first.
		 *
		 * @param id - The database id.
		 * @param options.range - `"24h"` (the default) returns the last 24 hours, one
		 * point every 5 minutes. `"7d"` returns the
		 * last 7 days, one point an hour with the hour's average and its `cpu_max` and
		 * `ram_max` peaks.
		 * @throws {SquareCloudAPIError} 400 `INVALID_PARAMETERS` when `range` is not
		 * `"24h"` or `"7d"`.
		 *
		 * @remarks `"7d"` needs a Pro or Enterprise plan. Other plans get the
		 * 24-hour answer without an error, so check the points you got rather than
		 * the range you asked for.
		 */
		metrics: this.metrics("databases"),
		/**
		 * Returns whether each of your databases is running, with its CPU and memory
		 * usage.
		 *
		 * @returns One item per database. `cpu` and `ram` are present only while the
		 * database runs.
		 */
		statusAll: () => this.request<StatusListItem[]>("GET", "databases/status"),
		/**
		 * Returns the database's TLS certificate and private key, which clients need to
		 * connect over TLS.
		 *
		 * @param databaseId - The database id.
		 * @returns A base64-encoded PEM that holds the private key followed by the
		 * certificate. Decode it with `atob()`.
		 * @throws {SquareCloudAPIError} 400 `DATABASE_NOT_RUNNING` when the database is
		 * stopped. Start it first.
		 */
		certificate: async (databaseId: string) =>
			(
				await this.request<{ certificate?: string } | undefined>(
					"GET",
					`databases/${e(databaseId)}/credentials/certificate`,
				)
			)?.certificate ?? "",
		/**
		 * Replaces the database's password or its TLS certificate with a new one.
		 *
		 * @param databaseId - The database id.
		 * @param reset - `"password"` or `"certificate"`.
		 * @returns The new password, or `""` for a certificate. Get the new certificate
		 * with `certificate()`.
		 * @throws {SquareCloudAPIError} 400 `DATABASE_NOT_RUNNING` when the database is
		 * stopped. Start it first.
		 */
		resetCredentials: async (
			databaseId: string,
			reset: "password" | "certificate",
		) =>
			(
				await this.request<{ password?: string } | undefined>(
					"POST",
					`databases/${e(databaseId)}/credentials/reset`,
					{ json: { reset } },
				)
			)?.password ?? "",

		/** Creates, lists and restores the database's snapshots. */
		snapshots: this.snapshots("databases"),
	};

	/**
	 * Creates and manages workspaces, which share your applications with other Square
	 * Cloud users.
	 *
	 * A call for a workspace that does not exist throws a {@link SquareCloudAPIError}
	 * with 404 `WORKSPACE_NOT_FOUND`.
	 */
	readonly workspaces = {
		/**
		 * Creates a workspace that you own.
		 *
		 * @param name - The workspace name: 1 to 32 letters, numbers, spaces, hyphens
		 * or underscores.
		 * @returns The new workspace's id and name.
		 * @throws {SquareCloudAPIError} 403 `UPGRADE_REQUIRED` on plans other than
		 * Standard, Pro and Enterprise, and 400 `WORKSPACE_LIMIT_REACHED` when you
		 * already own as many workspaces as your plan allows.
		 */
		create: (name: string) =>
			this.request<WorkspaceCreated>("POST", "workspaces", {
				json: { name },
			}),
		/** Lists the workspaces you own or belong to, with their members and applications. */
		list: () => this.request<Workspace[]>("GET", "workspaces"),
		/**
		 * Returns a workspace you own or belong to, with its members and applications.
		 *
		 * @param workspaceId - The workspace id.
		 */
		get: (workspaceId: string) =>
			this.request<Workspace>("GET", `workspaces/${e(workspaceId)}`),
		/**
		 * Deletes a workspace you own.
		 *
		 * @param workspaceId - The workspace id.
		 */
		delete: (workspaceId: string) =>
			this.request<void>("DELETE", "workspaces", { json: { workspaceId } }),
		/**
		 * Removes you from a workspace you belong to.
		 *
		 * @param workspaceId - The workspace id.
		 * @throws {SquareCloudAPIError} 400 `CANNOT_LEAVE_OWNER` when you own the
		 * workspace. Delete it with `delete()` instead.
		 */
		leave: (workspaceId: string) =>
			this.request<void>("DELETE", "workspaces/leave", {
				json: { workspaceId },
			}),

		/** Adds, updates and removes the members of a workspace you own. */
		members: {
			/**
			 * Adds a user to the workspace with the invite code they generated.
			 *
			 * @param workspaceId - The workspace id.
			 * @param code - The user's invite code, from their `inviteCode()`. It is
			 * valid for 5 minutes.
			 * @param group - The member's role.
			 * @throws {SquareCloudAPIError} 400 `INVALID_CODE` when the code is wrong or
			 * has expired, 400 `MEMBER_ALREADY_ADDED` when the user is already a member,
			 * and 400 `MEMBERS_LIMIT_REACHED` when the workspace has as many members as
			 * your plan allows.
			 */
			add: (workspaceId: string, code: string, group: WorkspaceGroup) =>
				this.request<void>("POST", "workspaces/members", {
					json: { workspaceId, code, group },
				}),
			/**
			 * Changes a member's role.
			 *
			 * @param workspaceId - The workspace id.
			 * @param memberId - The member's user id, from the workspace's `members`.
			 * @param group - The new role.
			 * @throws {SquareCloudAPIError} 404 `MEMBER_NOT_FOUND` when the user is not a
			 * member, and 400 `CANNOT_EDIT_OWNER` for the workspace owner.
			 */
			update: (workspaceId: string, memberId: string, group: WorkspaceGroup) =>
				this.request<void>("PATCH", "workspaces/members", {
					json: { workspaceId, memberId, group },
				}),
			/**
			 * Removes a member from the workspace.
			 *
			 * @param workspaceId - The workspace id.
			 * @param memberId - The member's user id, from the workspace's `members`.
			 * @throws {SquareCloudAPIError} 404 `MEMBER_NOT_FOUND` when the user is not a
			 * member.
			 */
			remove: (workspaceId: string, memberId: string) =>
				this.request<void>("DELETE", "workspaces/members", {
					json: { workspaceId, memberId },
				}),
			/**
			 * Generates an invite code that lets a workspace owner add you to their
			 * workspace.
			 *
			 * @returns The code. Give it to the owner, who passes it to `members.add()`
			 * within 5 minutes.
			 */
			inviteCode: async () =>
				(
					await this.request<{ code?: string } | undefined>(
						"GET",
						"workspaces/members/code",
					)
				)?.code ?? "",
		},

		/** Shares your applications in a workspace you own, or stops sharing them. */
		apps: {
			/**
			 * Shares one of your applications in the workspace.
			 *
			 * @param workspaceId - The workspace id.
			 * @param appId - The id of an application you own.
			 * @throws {SquareCloudAPIError} 400 `APP_ALREADY_IN_WORKSPACE` when the
			 * application is already shared there, and 400 `APPLICATIONS_LIMIT_REACHED`
			 * when the workspace has reached its limit of applications.
			 *
			 * @remarks Members then reach the application through the composite id
			 * `<appId>-<workspaceId>` (see {@link SquareCloudAPI.apps}).
			 */
			add: (workspaceId: string, appId: string) =>
				this.request<void>("POST", "workspaces/applications", {
					json: { workspaceId, appId },
				}),
			/**
			 * Stops sharing an application in the workspace.
			 *
			 * @param workspaceId - The workspace id.
			 * @param appId - The id of the shared application.
			 */
			remove: (workspaceId: string, appId: string) =>
				this.request<void>("DELETE", "workspaces/applications", {
					json: { workspaceId, appId },
				}),
		},
	};
}

// atob/btoa: every runtime has them (Buffer is Node-only)
const fromBase64 = (base64: string) => {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
};

const toBase64 = (bytes: Uint8Array) => {
	let binary = "";
	// Chunked: one spread of 10 MB would overflow the argument limit
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
};

/** Analytics answer `{}` when there is no traffic in the window. */
const orNull = <T>(response: T | object | undefined) =>
	response && Object.keys(response).length ? (response as T) : null;

type Frame = { event: string; data: string; id?: string };

/** Minimal text/event-stream parser (WHATWG rules, minus `retry` and lone-CR lines). */
async function* sse(body: ReadableStream<BufferSource>): AsyncGenerator<Frame> {
	// A partial line, kept in pieces: a long line split over many chunks is joined once
	let pending: string[] = [];
	let event = "";
	let data: string[] = [];
	let id: string | undefined;
	for await (const chunk of body.pipeThrough(new TextDecoderStream())) {
		pending.push(chunk);
		if (!chunk.includes("\n")) continue;
		const buffer = pending.join("");
		let start = 0;
		for (
			let end = buffer.indexOf("\n");
			end !== -1;
			end = buffer.indexOf("\n", start)
		) {
			const line = buffer.slice(
				start,
				buffer[end - 1] === "\r" ? end - 1 : end,
			);
			start = end + 1;
			if (!line) {
				if (data.length)
					yield { event: event || "message", data: data.join("\n"), id };
				event = "";
				data = [];
				continue;
			}
			const colon = line.indexOf(":");
			if (colon === 0) continue; // comment
			const field = colon === -1 ? line : line.slice(0, colon);
			let value = colon === -1 ? "" : line.slice(colon + 1);
			if (value[0] === " ") value = value.slice(1);
			if (field === "data") data.push(value);
			else if (field === "event") event = value;
			else if (field === "id" && !value.includes("\0")) id = value;
		}
		pending = [buffer.slice(start)];
	}
}

export * from "./error.ts";
export type * from "./types.ts";
