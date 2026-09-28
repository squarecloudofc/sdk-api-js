// Thin types written from the pinned spec/openapi.json. Field names mirror the
// API (snake_case, plus its few camelCase keys) so responses pass through untouched.
// Keys the API omits at runtime are optional even where the spec marks them required.

/** A `.zip` as a file path (Node.js, Deno, Bun), `Blob`/`File`, or raw bytes. */
export type FileInput = string | Blob | Uint8Array;

/** ISO 8601 string or `Date`. */
export type DateInput = string | Date;

export type SquareCloudAPIOptions = {
	/** Default `https://api.squarecloud.app/v2`. */
	baseUrl?: string;
	/**
	 * Per-attempt timeout for JSON calls, in ms (default 30000). Calls the server holds
	 * open (snapshots, start/stop/restart, `databases.create`, `ai.chat`) wait at least
	 * 120 s. Uploads, large `files.write` and `downloadSnapshot` have none (pass a
	 * `signal`); `realtime()` only until the stream opens. `<= 0`, `Infinity` or
	 * `>= 2^31` disables every timeout, floors included.
	 */
	timeoutMs?: number;
	/**
	 * Retries for network errors on GET, 503 `UPLOAD_BUSY`/`ANALYTICS_BUSY`, and 503
	 * `DATABASE_UNAVAILABLE` on GET (default 2). Never on 429 (`RATE_LIMITED` can be a
	 * 30-min block). `DATABASE_UNAVAILABLE` can fire after a mutation was applied: retry
	 * your idempotent mutations yourself.
	 */
	maxRetries?: number;
	/** Replaces the whole `User-Agent` header (default `squarecloud-sdk-js/<version>`). */
	userAgent?: string;
	/** Custom `fetch` (proxies, tracing, tests). Defaults to the global one. */
	fetch?: typeof fetch;
};

// Account & service

export type Plan = {
	/** e.g. `free`, `hobby-2`, `standard-8`, `pro-16`, `enterprise-64`. */
	name: string;
	/** MB. */
	memory: { limit: number; available: number; used: number };
	/** Unix ms at which the plan EXPIRES (a timestamp, not a duration). `null` never expires. */
	duration: number | null;
};

export type User = {
	id: string;
	name: string;
	email: string;
	locale: string;
	plan: Plan;
	created_at: string;
};

export type AppSummary = {
	id: string;
	name: string;
	desc?: string;
	/** MB. */
	ram: number;
	lang: string;
	/** Default `<subdomain>.squareweb.app` host; omitted or `null` for non-web apps. */
	domain?: string | null;
	/** Custom domain; omitted or `null` when none is set. */
	custom?: string | null;
	cluster: string;
	created_at: string;
};

export type DatabaseSummary = {
	id: string;
	name: string;
	ram: number;
	type: string;
	cluster: string;
	created_at: string;
};

/** API keys restricted to resources only see their own apps and databases. */
export type Account = {
	user: User;
	applications: AppSummary[];
	databases: DatabaseSummary[];
};

export type ServiceEntry = {
	name: string;
	status: "operational" | "degraded" | "outage" | "maintenance" | "unknown";
	/** Only when not operational. */
	summary?: string;
	unresolved_incidents?: number;
	degraded_components?: number;
	api_latency?: {
		recent_ms?: number;
		day_mean_ms?: number;
		elevated?: boolean;
	};
};

/** Public, unauthenticated platform status (no `{status, response}` envelope). */
export type ServiceStatus = {
	/** `unknown`: the check itself could not run (not evidence of an outage). */
	status: "online" | "degraded" | "unknown";
	message: string;
	checked_at?: string;
	stale?: boolean;
	services?: Record<string, ServiceEntry>;
	dependencies?: Record<string, ServiceEntry>;
};

// Snapshots

export type SnapshotScope = "applications" | "databases";

export type Snapshot = {
	/** The snapshot id restore takes: `<appId|databaseId>[_<runtime>][_<origin>]`. */
	name: string;
	/** Bytes. */
	size: number;
	modified: string;
	/** Signed query string of the storage URL. */
	key: string;
	/** Storage version of this snapshot: pass it to `snapshots.restore()`. */
	version_id: string;
	/** Signed download URL, valid 30 days. Pass it to `downloadSnapshot()`. */
	url: string;
	/** Database engine or app language. `null` on old snapshots. */
	runtime?: string | null;
	origin?: "automatic" | "manual" | null;
};

/** `pending: true` means the snapshot is still generating (202): it shows up in `list()` in ~2 min. */
export type SnapshotCreated =
	| { pending: true }
	| {
			pending: false;
			/** Signed download URL, valid 30 days. Pass it to `downloadSnapshot()`. */
			url: string;
			key: string;
	  };

// Apps

export type App = {
	id: string;
	name: string;
	desc?: string;
	owner: string;
	cluster: string;
	/** MB. */
	ram: number;
	language: string;
	/** Default `<subdomain>.squareweb.app` host; omitted or `null` for non-web apps. */
	domain?: string | null;
	/** Custom domain; omitted or `null` when none is set. */
	custom?: string | null;
	created_at: string;
};

export type AppCreated = {
	id: string;
	name: string;
	/** Omitted when unset. */
	description?: string;
	/** Full `<subdomain>.squareweb.app` host; omitted for non-web apps. */
	domain?: string;
	/** Cluster the app was placed on. */
	cluster?: string;
	ram: number;
	cpu: number;
	language: { name: string; version: string };
};

/** One entry of `statusAll()`; `cpu`/`ram` only while running. */
export type StatusListItem = {
	id: string;
	running: boolean;
	cpu?: string;
	ram?: string;
};

/** Formatted strings by default; numbers with `{ raw: true }`. */
export type RuntimeStats<Raw extends boolean = false> = {
	/** e.g. `"0.5%"`; a number with `{ raw: true }`. */
	cpu: Raw extends true ? number : string;
	/** RAM in use, e.g. `"120.4MB"`; a number of MB with `{ raw: true }`. */
	ram: Raw extends true ? number : string;
	/** e.g. `running`, `exited`. */
	status: string;
	running: boolean;
	storage: Raw extends true ? number : string;
	network: {
		total: Raw extends true ? [number, number] : string;
		now: Raw extends true ? [number, number] : string;
	};
	/** Unix ms at which it last STARTED (a timestamp, not a duration). `null` when stopped. */
	uptime: number | null;
};

/** Metrics come newest first. */
export type MetricPoint = {
	date: string;
	cpu: number;
	ram: number;
	net: number[];
};

export type AppDomain = {
	app_id: string;
	hostname: string;
	type: "subdomain" | "custom";
};

export type LoadBalancers = {
	/** Apps that may share one domain on your plan. */
	limit: number;
	balancers: {
		hostname: string;
		apps: { id: string; name: string; cluster?: string }[];
	}[];
};

export type DeployEvent = {
	/** The commit SHA. */
	id: string;
	state: "pending" | "clone" | "commit" | "restarting" | "success" | "error";
	date: string;
	/** Only Git deploys (webhook and GitHub App pushes) are recorded. */
	source: "git";
	/** On `clone` events. */
	branch?: string;
	/** On `error` events: why the deploy failed, e.g. `CLONE_FAILED`. */
	code?: string;
	/** On some `error` events: the failure details. */
	message?: string;
	/** On `commit` events. */
	files?: { added: string[]; removed: string[]; modified: string[] };
};

/** The GitHub App link as `deploys.current()` reports it. */
export type DeployRepository = {
	id: number | null;
	/** e.g. `octocat/hello-world`. */
	name: string | null;
	branch: string | null;
};

/** `{}` when neither the GitHub App nor a webhook is configured. */
export type DeployCurrent = {
	app?: DeployRepository;
	webhook?: string;
};

/** Returned by `deploys.linkGithubApp()`. */
export type LinkedRepository = {
	/** GitHub repository id. */
	id: number;
	/** e.g. `octocat/hello-world`. */
	full_name: string;
	branch: string;
};

export type EnvVars = Record<string, string>;

export type FileEntry = {
	name: string;
	type: "file" | "directory";
	/** Omitted on some directory entries (e.g. one a commit just unpacked). */
	size?: number;
	/** Unix ms, may carry a fraction; `null` when unreadable, omitted where `size` is. */
	lastModified?: number | null;
};

/** A `string` goes as plain text, bytes as base64. Max 10 MB; empty writes an empty file. */
export type FileContent = string | Uint8Array;

// Realtime

/** Live container metrics; lean frames are merged onto the last full one. */
export type RealtimeStatus = {
	cpu?: number;
	/** Number of CPU cores allocated. */
	cpuLimit?: number;
	/** `[usedMB, limitMB]`. */
	ram?: [number, number];
	status?: string;
	netIO?: { i: number; o: number; new?: { i: number; o: number } };
	bIO?: { i: number; o: number };
	/** Unix ms of the container start. */
	uptime?: number;
};

export type RealtimeEvent =
	| {
			event: "logs";
			data: string;
			id?: string;
			stream: "stdout" | "stderr";
			line: string;
	  }
	| { event: "status"; data: string; id?: string; status: RealtimeStatus }
	/** `system`: `REALTIME_CONNECTING | <id>`, `REALTIME_TIMEOUT`, `REALTIME_DISCONNECTED`, ... `error`: a code such as `CONTAINER_NOT_FOUND`. `message`: a frame without `event:`. */
	| { event: "system" | "error" | "message"; data: string; id?: string };

// Network

/**
 * Optional filters of `network.analytics()`. Each takes the exact `type` value of its
 * breakdown; an invalid one is 400 `INVALID_FILTER`.
 */
export type AnalyticsFilters = {
	/** 2-letter code, e.g. `BR`. */
	country?: string;
	ip?: string;
	/** Path prefix, e.g. `/api`. */
	path?: string;
	/** e.g. `404`. */
	status?: string;
	os?: string;
	browser?: string;
	protocol?: string;
	/** `Direct` = no referer. */
	referer?: string;
	/** The exact `type` of a `providers` bucket, `"NAME (ASN)"`, e.g. `GOOGLE (15169)`. */
	provider?: string;
	content_type?: string;
	bot?: string;
};

export type AnalyticsBucket = {
	/** The dimension value; `providers` use `"NAME (ASN)"`. */
	type: string;
	visits: number;
	requests: number;
	bytes: number;
	date?: string;
};

export type NetworkAnalytics = {
	visits: { visits: number; requests: number; bytes: number; date: string }[];
	countries: AnalyticsBucket[];
	devices: AnalyticsBucket[];
	os: AnalyticsBucket[];
	browsers: AnalyticsBucket[];
	protocols: AnalyticsBucket[];
	methods: AnalyticsBucket[];
	paths: AnalyticsBucket[];
	referers: AnalyticsBucket[];
	providers: AnalyticsBucket[];
	ips: AnalyticsBucket[];
	status_codes: AnalyticsBucket[];
	bots: AnalyticsBucket[];
	content_types: AnalyticsBucket[];
};

export type NetworkErrors = {
	summary: { total: number; by_class: { "4xx": number; "5xx": number } };
	by_status: { status: number; requests: number }[];
	timeseries: {
		date: string;
		buckets: Record<string, number>;
		total: number;
	}[];
	top_paths: {
		path: string;
		method: string | null;
		total: number;
		by_status: Record<string, number>;
	}[];
	by_method: {
		method: string | null;
		total: number;
		by_status: Record<string, number>;
	}[];
};

export type NetworkLog = {
	timestamp: string;
	client: {
		ip: string | null;
		country: string | null;
		location: string | null;
		asn: string;
		agent: string | null;
		category: string | null;
	};
	request: {
		mitigated: boolean;
		method: string;
		host: string;
		path: string;
		query: string | null;
		protocol: string;
		referer: string | null;
	};
	response: {
		status: number;
		contentType: string | null;
		cache: string | null;
	};
};

/** ms; `null` when the window has no requests. */
export type Percentiles = {
	p50: number | null;
	p95: number | null;
	p99: number | null;
};

export type NetworkPerformance = {
	summary: { edge: Percentiles; origin: Percentiles; requests: number };
	timeseries: {
		date: string;
		requests: number;
		edge: Percentiles;
		origin: Percentiles;
	}[];
	countries: {
		type: string;
		p50: number | null;
		p95: number | null;
		requests: number;
	}[];
	colos: {
		type: string;
		city: string | null;
		country: string | null;
		p50: number | null;
		p95: number | null;
		requests: number;
	}[];
	slowest_paths: {
		path: string;
		p95: number | null;
		p99: number | null;
		requests: number;
	}[];
};

export type DNSRecord = {
	type: "txt" | "cname";
	name: string;
	value: string;
	status: string;
};

// Databases

export type DatabaseType = "mongo" | "mysql" | "redis" | "postgres";

export type Database = {
	id: string;
	name: string;
	owner: string;
	cluster: string;
	/** MB. */
	ram: number;
	type: DatabaseType;
	port: number;
	created_at: string;
};

export type DatabaseCreate = {
	/** 1-32 chars. */
	name: string;
	/** MB, an integer: a fraction or a string is 400 `INVALID_MEMORY`. */
	memory: number;
	type: DatabaseType;
	/** Full version or a prefix such as `"8"`. */
	version: string;
};

export type DatabaseCreated = {
	id: string;
	name: string;
	memory: number;
	cpu: number;
	type: DatabaseType;
	password: string;
	/** Base64 PEM (private key, then certificate); `null` when it could not be produced. */
	certificate?: string | null;
	connection_url: string;
	cluster: string;
};

export type DatabaseUpdate = { name?: string; ram?: number };

// Workspaces

export type WorkspaceCreated = { id: string; name: string };

export type WorkspaceGroup = "admin" | "maintain" | "manager" | "view";

export type Workspace = {
	/** 32 hex chars (a UUID v4 without hyphens); older workspaces keep a 40-hex id. */
	id: string;
	name: string;
	owner: string;
	members: {
		id: string;
		/** `null` when it cannot be resolved (e.g. a deleted account). */
		name: string | null;
		group: WorkspaceGroup | "owner";
		joinedAt: string;
	}[];
	applications: {
		id: string;
		name: string;
		desc: string | null;
		ram: number;
		lang: string;
		/** Omitted or `null` for non-web apps. */
		domain?: string | null;
		/** Omitted or `null` when none is set. */
		custom?: string | null;
	}[];
	createdAt: string;
};

// AI (OpenAI-compatible, non-streaming)

export type ChatMessage = {
	role: "system" | "user" | "assistant" | "tool";
	content?: string;
	tool_call_id?: string;
	tool_calls?: Record<string, unknown>[];
};

export type ChatRequest = {
	model?: string;
	messages: ChatMessage[];
	tools?: Record<string, unknown>[];
	tool_choice?:
		| "auto"
		| "none"
		| "required"
		| { type: "function"; function: { name: string } };
	max_tokens?: number;
	temperature?: number;
};

export type ChatCompletion = {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: {
		index: number;
		message: {
			role: string;
			content: string | null;
			tool_calls?: Record<string, unknown>[];
		};
		finish_reason: string;
	}[];
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
};
