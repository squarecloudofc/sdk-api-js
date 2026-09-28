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
	SnapshotScope,
	SquareCloudAPIOptions,
	StatusListItem,
	Workspace,
	WorkspaceCreated,
	WorkspaceGroup,
} from "./types.ts";

// Inlined by the bundler: no runtime `process` access, however the build is run
const USER_AGENT = `squarecloud-sdk-js/${pkg.version}`;
export const BASE_URL = "https://api.squarecloud.app/v2";
/** Upload cap of `POST /apps` and `commit` (per file). */
const MAX_UPLOAD = 100 * 1024 * 1024;
/** Decoded content cap of `files.write`. */
const MAX_FILE = 10 * 1024 * 1024;
/** `files.write` content above this many bytes is an upload: no timeout. */
const LARGE_WRITE = 1024 * 1024;
/**
 * Timeout floor for calls the server holds open: a snapshot answers 202 only at
 * ~90 s, database provisioning and lifecycle actions take up to 95 s.
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
 * Client for the Square Cloud API (v2).
 *
 * Every `appId` may be `<appId>-<workspaceId>` to act on an application shared
 * with you through a workspace.
 *
 * @example
 * ```js
 * const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY);
 * await api.apps.restart(appId);
 * ```
 */
export class SquareCloudAPI {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	/** `0` when disabled: no timeout at all, floors included. */
	private readonly timeoutMs: number;
	private readonly maxRetries: number;
	private readonly userAgent: string;
	private readonly fetch?: typeof fetch;

	/** @param apiKey - From https://squarecloud.app/account/security (a session JWT also works). */
	constructor(apiKey: string, options: SquareCloudAPIOptions = {}) {
		if (typeof apiKey !== "string" || !apiKey.trim()) {
			throw new TypeError("SquareCloudAPI: apiKey must be a non-empty string");
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

	/** An error raised without a response (local check, dropped stream): status 0. */
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
				'Empty, "." and ".." are not valid ids',
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
								new DOMException(`No response in ${ms} ms`, "TimeoutError"),
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
					// a 202 SNAPSHOT_PROCESSING is not one: callers read it as pending
					(!raw && response.status !== 202 && data?.status === "error");
				if (!failed) return (raw ? data : data?.response) as T;
				// Square envelope {status, code, message} or, on the AI route, the OpenAI shape
				// {error: {message, type, param, code}} with lowercase codes (`code` may be null)
				// (`error: null` is not the AI dialect: typeof null is "object")
				const err =
					data?.error && typeof data.error === "object" ? data.error : data;
				const code = err?.code || err?.type;
				error = new SquareCloudAPIError(
					response.status,
					code || "UNKNOWN_ERROR",
					// No code at all (e.g. a proxy page, S3 XML): the status is the only clue
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
				"Uploads are limited to 100 MB",
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
				if (!handoff) return; // clean EOF (e.g. the 10-minute TTL)
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

	/** The snapshot routes, identical for apps and databases. */
	private snapshots(base: "apps" | "databases") {
		return {
			/** Each item carries its `version_id` (for `restore()`) and a signed download `url`. */
			list: async (id: string) =>
				(await this.request<Snapshot[]>("GET", `${base}/${e(id)}/snapshots`)) ??
				[],
			/** `{ pending: true }` when it is still generating (large ones). */
			create: async (id: string) =>
				created(
					await this.request("POST", `${base}/${e(id)}/snapshots`, {
						floor: SLOW_MS,
					}),
				),
			/**
			 * `name` and `version_id` of a listed `Snapshot`. Any failure is 404
			 * `SNAPSHOT_RESTORE_FAILED`.
			 */
			restore: (id: string, name: string, versionId: string) =>
				this.request<void>("POST", `${base}/${e(id)}/snapshots/restore`, {
					json: { snapshotId: name, versionId },
					floor: SLOW_MS,
				}),
		};
	}

	/** Runtime stats: formatted strings by default; `{ raw: true }` for numbers. */
	private stats(base: "apps" | "databases") {
		return <Raw extends boolean = false>(
			id: string,
			{ raw }: { raw?: Raw } = {},
		) =>
			this.request<RuntimeStats<Raw>>("GET", `${base}/${e(id)}/status`, {
				query: { rawData: raw },
			});
	}

	/**
	 * start/stop/restart: the server holds these open until the container acts. A refusal
	 * is 409 with a code only: `CONTAINER_ALREADY_STARTED`, `CONTAINER_ALREADY_STOPPED`,
	 * `CONTAINER_TEMPORARILY_SUSPENDED`, `CONTAINER_NOT_FOUND`,
	 * `CONTAINER_INSUFFICIENT_DISK_SPACE`, `CONTAINER_NETWORK_CONFLICT` or `ACTION_FAILED`.
	 */
	private action(base: "apps" | "databases", action: string) {
		return (id: string) =>
			this.request<void>("POST", `${base}/${e(id)}/${action}`, {
				floor: SLOW_MS,
			});
	}

	/**
	 * Streams a snapshot zip from its signed URL (from `snapshots.create()`).
	 * Nothing is buffered: pipe it to a file.
	 *
	 * @example
	 * ```js
	 * import { Writable } from "node:stream";
	 * const stream = await api.downloadSnapshot(url);
	 * await stream.pipeTo(Writable.toWeb(fs.createWriteStream("backup.zip")));
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

	readonly account = {
		/** The user, plus the apps and databases this key can see. */
		me: () => this.request<Account>("GET", "users/me"),
		/** Every snapshot of the account (paid plans only: 402 otherwise). */
		snapshots: async ({ scope }: { scope?: SnapshotScope } = {}) =>
			(await this.request<Snapshot[]>("GET", "users/snapshots", {
				query: { scope },
			})) ?? [],
	};

	readonly service = {
		/** Public platform status; needs no valid key. */
		status: () =>
			this.request<ServiceStatus>("GET", "service/status", { raw: true }),
	};

	readonly ai = {
		/**
		 * OpenAI-compatible chat completion (Standard plan and up). Streaming is not
		 * supported. Every error of this route (auth, scope, rate limit, 5xx included) is
		 * OpenAI-shaped and surfaces as `SquareCloudAPIError` with its lowercase `code`
		 * (`access_denied`, `rate_limit_exceeded`, `database_unavailable`, ...), or its
		 * `type` when it has none.
		 * The gateway gives the whole request 90 s, then answers 503 `server_overloaded`:
		 * safe to retry, but the SDK does not (the POST is not idempotent).
		 */
		chat: (request: ChatRequest) =>
			this.request<ChatCompletion>("POST", "ai/chat/completions", {
				json: request,
				raw: true,
				floor: AI_MS,
			}),
	};

	readonly apps = {
		/** Deploys a `.zip` (max 100 MB) with a `squarecloud.app` config file. No timeout: pass a `signal` to cancel. */
		create: (file: FileInput, { signal }: { signal?: AbortSignal } = {}) =>
			this.upload<AppCreated>("apps", file, "app.zip", { signal }),
		get: (appId: string) => this.request<App>("GET", `apps/${e(appId)}`),
		delete: (appId: string) => this.request<void>("DELETE", `apps/${e(appId)}`),
		/** Running state of every app this key can see, optionally one workspace's. */
		statusAll: ({ workspaceId }: { workspaceId?: string } = {}) =>
			this.request<StatusListItem[]>("GET", "apps/status", {
				query: { workspaceId },
			}),
		/** Formatted strings by default; `{ raw: true }` for numbers. */
		status: this.stats("apps"),
		start: this.action("apps", "start"),
		stop: this.action("apps", "stop"),
		restart: this.action("apps", "restart"),
		/** `""` when the API sends none. */
		logs: async (appId: string) =>
			(
				await this.request<{ logs?: string } | undefined>(
					"GET",
					`apps/${e(appId)}/logs`,
				)
			)?.logs ?? "",
		/** Last 24 h, one point per 5 min, newest first. */
		metrics: (appId: string) =>
			this.request<MetricPoint[]>("GET", `apps/${e(appId)}/metrics`),
		/**
		 * Live logs, status and system events over SSE, parsed. Status frames are
		 * merged so `event.status` is always complete. Ends on a clean close (10-min
		 * TTL) or `abort()`; reconnects (at most 3 times in a row) on dropped
		 * connections and when the API sends `REALTIME_RECONNECT`.
		 * Max 5 concurrent streams per account.
		 *
		 * @example
		 * ```js
		 * for await (const event of api.apps.realtime(appId, { signal })) {
		 *   if (event.event === "logs") console.log(event.stream, event.line);
		 * }
		 * ```
		 */
		realtime: (appId: string, options?: { signal?: AbortSignal }) =>
			this.stream(appId, options),
		/** Default and custom hostnames of every app. */
		domains: () => this.request<AppDomain[]>("GET", "apps/domains"),
		loadBalancers: () =>
			this.request<LoadBalancers>("GET", "apps/load-balancers"),
		/**
		 * Uploads a file into the app: a `.zip` is unpacked at `path`, any other
		 * file lands at `path/filename`. `filename` defaults to the file's own name.
		 * No timeout: pass a `signal` to cancel.
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

		deploys: {
			/** GitHub webhook deploys. Pass `"@"` to remove; returns the webhook URL (`""` on removal). */
			setWebhook: async (appId: string, accessToken: string) =>
				(
					await this.request<{ webhook?: string } | undefined>(
						"POST",
						`apps/${e(appId)}/deploy/webhook`,
						{ json: { access_token: accessToken } },
					)
				)?.webhook ?? "",
			/**
			 * Links a repository installed through the Square Cloud GitHub App (scope
			 * `apps:deploy`, 3 calls per 60 s). Re-linking needs `unlinkGithubApp()` first.
			 * Errors: 403 `GITHUB_NOT_CONNECTED` (no GitHub App installation), 403
			 * `REPOSITORY_NOT_AVAILABLE` (not in your GitHub App installation),
			 * 403 `REPOSITORY_PERMISSION_REQUIRED` (no write access), 502 `FAILED_TO_FETCH`
			 * (GitHub did not confirm the branch; safe to retry), 409
			 * `REPOSITORY_BRANCH_ALREADY_CONFIGURED` (another app of any account links the
			 * pair; its id is only in `message`, and only when that app is yours).
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
			/** `400 GIT_NOT_CONFIGURED` when nothing is linked. */
			unlinkGithubApp: (appId: string) =>
				this.request<void>("DELETE", `apps/${e(appId)}/deploy/github-app`),
			/**
			 * One timeline per deploy, oldest event first. A failed deploy ends in a
			 * `state: "error"` event with `code` (and `message` when there are details).
			 */
			list: (appId: string) =>
				this.request<DeployEvent[][]>("GET", `apps/${e(appId)}/deployments`),
			/** `{}` when nothing is configured. */
			current: async (appId: string) =>
				(await this.request<DeployCurrent | undefined>(
					"GET",
					`apps/${e(appId)}/deployments/current`,
				)) ?? {},
		},

		envs: {
			get: (appId: string) =>
				this.request<EnvVars>("GET", `apps/${e(appId)}/envs`),
			/** Adds or overwrites these keys; returns every variable. */
			set: (appId: string, envs: EnvVars) =>
				this.request<EnvVars>("POST", `apps/${e(appId)}/envs`, {
					json: { envs },
				}),
			/** Replaces ALL variables. */
			replace: (appId: string, envs: EnvVars) =>
				this.request<EnvVars>("PUT", `apps/${e(appId)}/envs`, {
					json: { envs },
				}),
			delete: (appId: string, keys: string[]) =>
				this.request<EnvVars>("DELETE", `apps/${e(appId)}/envs`, {
					json: { envs: keys },
				}),
		},

		files: {
			/** 404 `FILE_NOT_FOUND` when the directory does not exist; 403 `BLOCKED_PATH`. Paths: max 256 chars. */
			list: (appId: string, path?: string) =>
				this.request<FileEntry[]>("GET", `apps/${e(appId)}/files`, {
					query: { path },
				}),
			/** The file's bytes (max 10 MB: 413 `FILE_TOO_LARGE` above). */
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
			 * Creates or overwrites (max 10 MB). A string goes as plain text, bytes as
			 * base64. Empty content writes an empty file. Writes above 1 MiB (UTF-8 bytes)
			 * have no timeout: pass a `signal` to cancel.
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
						"File content is limited to 10 MB",
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
			move: (appId: string, path: string, to: string) =>
				this.request<void>("PATCH", `apps/${e(appId)}/files`, {
					json: { path, to },
				}),
			delete: (appId: string, path: string) =>
				this.request<void>("DELETE", `apps/${e(appId)}/files`, {
					json: { path },
				}),
		},

		snapshots: this.snapshots("apps"),

		/** Web apps only. Windows (`start` to `end`) are at most 7 days. */
		network: {
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
			/** 5xx only unless `include_4xx`. */
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
			logs: (appId: string, start: DateInput, end: DateInput) =>
				this.request<NetworkLog[]>("GET", `apps/${e(appId)}/network/logs`, {
					query: { start, end },
				}),
			performance: async (appId: string, start: DateInput, end: DateInput) =>
				orNull(
					await this.request<NetworkPerformance | object>(
						"GET",
						`apps/${e(appId)}/network/performance`,
						{ query: { start, end } },
					),
				),
			dns: (appId: string) =>
				this.request<DNSRecord[]>("GET", `apps/${e(appId)}/network/dns`),
			/** Pass `"@"` to remove the custom domain. */
			setDomain: (appId: string, domain: string) =>
				this.request<void>("POST", `apps/${e(appId)}/network/custom`, {
					json: { custom: domain },
				}),
			purgeCache: (appId: string) =>
				this.request<void>("POST", `apps/${e(appId)}/network/purge_cache`),
		},
	};

	readonly databases = {
		/** The password is only returned here and by `resetCredentials()`. */
		create: (database: DatabaseCreate) =>
			this.request<DatabaseCreated>("POST", "databases", {
				json: database,
				floor: SLOW_MS,
			}),
		get: (databaseId: string) =>
			this.request<Database>("GET", `databases/${e(databaseId)}`),
		update: (databaseId: string, changes: DatabaseUpdate) =>
			this.request<void>("PATCH", `databases/${e(databaseId)}`, {
				json: changes,
			}),
		delete: (databaseId: string) =>
			this.request<void>("DELETE", `databases/${e(databaseId)}`),
		start: this.action("databases", "start"),
		stop: this.action("databases", "stop"),
		/** Formatted strings by default; `{ raw: true }` for numbers. */
		status: this.stats("databases"),
		/** Last 24 h, one point per 5 min, newest first. */
		metrics: (databaseId: string) =>
			this.request<MetricPoint[]>("GET", `databases/${e(databaseId)}/metrics`),
		statusAll: () => this.request<StatusListItem[]>("GET", "databases/status"),
		/** The TLS certificate, base64-encoded PEM. */
		certificate: async (databaseId: string) =>
			(
				await this.request<{ certificate?: string } | undefined>(
					"GET",
					`databases/${e(databaseId)}/credentials/certificate`,
				)
			)?.certificate ?? "",
		/** Rotates the password (returns it) or the certificate (returns `""`). */
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

		snapshots: this.snapshots("databases"),
	};

	readonly workspaces = {
		create: (name: string) =>
			this.request<WorkspaceCreated>("POST", "workspaces", {
				json: { name },
			}),
		list: () => this.request<Workspace[]>("GET", "workspaces"),
		get: (workspaceId: string) =>
			this.request<Workspace>("GET", `workspaces/${e(workspaceId)}`),
		delete: (workspaceId: string) =>
			this.request<void>("DELETE", "workspaces", { json: { workspaceId } }),
		leave: (workspaceId: string) =>
			this.request<void>("DELETE", "workspaces/leave", {
				json: { workspaceId },
			}),

		members: {
			/** Adds the user who generated `code` (their `inviteCode()`, valid 5 min) with this role. */
			add: (workspaceId: string, code: string, group: WorkspaceGroup) =>
				this.request<void>("POST", "workspaces/members", {
					json: { workspaceId, code, group },
				}),
			update: (workspaceId: string, memberId: string, group: WorkspaceGroup) =>
				this.request<void>("PATCH", "workspaces/members", {
					json: { workspaceId, memberId, group },
				}),
			remove: (workspaceId: string, memberId: string) =>
				this.request<void>("DELETE", "workspaces/members", {
					json: { workspaceId, memberId },
				}),
			/** Your invite code (valid 5 min): a workspace owner passes it to `members.add()`. */
			inviteCode: async () =>
				(
					await this.request<{ code?: string } | undefined>(
						"GET",
						"workspaces/members/code",
					)
				)?.code ?? "",
		},

		apps: {
			add: (workspaceId: string, appId: string) =>
				this.request<void>("POST", "workspaces/applications", {
					json: { workspaceId, appId },
				}),
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

const created = (response: unknown): SnapshotCreated =>
	response
		? { pending: false, ...(response as { url: string; key: string }) }
		: { pending: true };

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
