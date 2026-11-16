// Thin types written from the pinned spec/openapi.json. Field names mirror the
// API (snake_case, plus its few camelCase keys) so responses pass through untouched.
// Keys the API omits at runtime are optional even where the spec marks them required.

/**
 * A file to upload: a path on disk (Node.js, Deno and Bun), a `Blob` or `File`, or
 * the file's bytes.
 */
export type FileInput = string | Blob | Uint8Array;

/** A point in time, as an ISO 8601 string or a `Date`. */
export type DateInput = string | Date;

/** Optional settings for {@link SquareCloudAPI}. */
export type SquareCloudAPIOptions = {
	/**
	 * The base URL of the API. The default is `BASE_URL`,
	 * `https://api.squarecloud.app/v2`. A trailing `/` is removed.
	 */
	baseUrl?: string;
	/**
	 * The timeout of each attempt, in milliseconds. The default is 30000.
	 *
	 * @remarks Calls that can take more than a minute have a timeout of at least
	 * 120 seconds: start, stop and restart, `databases.create()`, snapshot `create()`
	 * and `restore()`, and `ai.chat()`. Uploads, a `files.write()` of more than 1 MiB
	 * and `downloadSnapshot()` have no timeout, so pass a `signal` to cancel them.
	 * `realtime()` is timed only until the stream opens. A value of 0 or less,
	 * `Infinity`, or 2^31 or more disables every timeout, including the 120-second
	 * minimum.
	 */
	timeoutMs?: number;
	/**
	 * How many times the SDK retries a failed call. The default is 2, and a negative
	 * value means no retries.
	 *
	 * @remarks The SDK retries only failures that are safe to repeat: network errors on
	 * GET calls, 503 `UPLOAD_BUSY` and `ANALYTICS_BUSY`, and 503
	 * `DATABASE_UNAVAILABLE` on GET calls. It waits longer before each new attempt. It
	 * never retries a 429, because `RATE_LIMITED` can block you for about 30 minutes.
	 * A 503 `DATABASE_UNAVAILABLE` can arrive after a change was applied, so retry
	 * your own idempotent changes yourself.
	 */
	maxRetries?: number;
	/**
	 * The `User-Agent` header. It replaces the default,
	 * `squarecloud-sdk-js/<version>`, entirely.
	 */
	userAgent?: string;
	/**
	 * The `fetch` function that sends every request, for example to add a proxy or
	 * tracing. The default is the global `fetch`.
	 */
	fetch?: typeof fetch;
};

// Account & service

/** Your Square Cloud plan and its memory. */
export type Plan = {
	/**
	 * The plan name, such as `hobby-2`, `standard-8`, `pro-16` or `enterprise-64`. It
	 * is `free` when the account has no active plan.
	 */
	name: string;
	/**
	 * The plan's memory in MB: the total `limit`, the memory still `available`, and
	 * the memory `used` by your applications and databases.
	 */
	memory: { limit: number; available: number; used: number };
	/**
	 * When the plan expires, as a Unix timestamp in milliseconds. Despite its name, it
	 * is a point in time, not a length of time. It is `null` when the account has no
	 * active plan.
	 */
	duration: number | null;
};

/** Your Square Cloud user. */
export type User = {
	id: string;
	name: string;
	email: string;
	/** The preferred locale, such as `en-US`. */
	locale: string;
	plan: Plan;
	created_at: string;
};

/** An application as {@link Account} lists it. */
export type AppSummary = {
	id: string;
	name: string;
	/** The description. It is omitted when the application has none. */
	desc?: string;
	/** The memory allocated to the application, in MB. */
	ram: number;
	/** The language, such as `javascript`. */
	lang: string;
	/**
	 * The default `<subdomain>.squareweb.app` hostname. It is omitted or `null` when
	 * the application is not a website.
	 */
	domain?: string | null;
	/** The custom domain. It is omitted or `null` when none is set. */
	custom?: string | null;
	/** The cluster that hosts the application. */
	cluster: string;
	created_at: string;
};

/** A database as {@link Account} lists it. */
export type DatabaseSummary = {
	id: string;
	name: string;
	/** The memory allocated to the database, in MB. */
	ram: number;
	/** The database engine. */
	type: string;
	/** The cluster that hosts the database. */
	cluster: string;
	created_at: string;
};

/**
 * Your user, with the applications and databases your API key can see. An API key
 * limited to specific resources sees only those.
 */
export type Account = {
	user: User;
	applications: AppSummary[];
	databases: DatabaseSummary[];
};

/** The health of one Square Cloud service or external dependency. */
export type ServiceEntry = {
	name: string;
	/** `unknown` means the check could not run, which is not evidence of an outage. */
	status: "operational" | "degraded" | "outage" | "maintenance" | "unknown";
	/** What is wrong and what it affects. It is present only when the entry is not operational. */
	summary?: string;
	/** The number of open incidents. */
	unresolved_incidents?: number;
	/** The number of components that are not fully working. */
	degraded_components?: number;
	/** The recent and daily average API latency in milliseconds, and whether it is `elevated`. */
	api_latency?: {
		recent_ms?: number;
		day_mean_ms?: number;
		elevated?: boolean;
	};
};

/** A maintenance or incident posted on the status page. */
export type ServiceIncident = {
	type: "maintenance" | "incident";
	title: string;
	status: "maintenance" | "degraded" | "outage" | "operational" | "unknown";
	started_at: string;
	/** When a maintenance is expected to end. It is `null` when no end was announced. */
	ends_at?: string | null;
	/** The names of the affected components. */
	affected: string[];
	/** The latest update, as written on the status page. It can contain Markdown. */
	update?: string;
	updated_at?: string | null;
};

/** A status page component that is not operational. */
export type ServiceComponent = {
	name: string;
	status: "maintenance" | "degraded" | "outage";
};

/** The public status of the Square Cloud platform, from `service.status()`. */
export type ServiceStatus = {
	/** `unknown` means the check could not run, which is not evidence of an outage. */
	status: "online" | "maintenance" | "degraded" | "unknown";
	/** A summary of the status. */
	message: string;
	checked_at?: string;
	stale?: boolean;
	/** The health of each Square Cloud service, by name. */
	services?: Record<string, ServiceEntry>;
	/** The health of each external service the platform depends on, by name. */
	dependencies?: Record<string, ServiceEntry>;
	/** The open maintenances and incidents. */
	incidents?: ServiceIncident[];
	/** The components that are not operational. */
	components?: ServiceComponent[];
};

// Snapshots

/** Which snapshots `account.snapshots()` lists: those of your applications or of your databases. */
export type SnapshotScope = "applications" | "databases";

/** A backup of an application or database that you can download or restore. */
export type Snapshot = {
	/**
	 * The snapshot id that `snapshots.restore()` takes, in the form
	 * `<appId|databaseId>[_<runtime>][_<origin>]`.
	 */
	name: string;
	/** The size in bytes. */
	size: number;
	/** When the snapshot was last modified. */
	modified: string;
	/** The signed query string of the download URL. */
	key: string;
	/** The snapshot version that `snapshots.restore()` takes. */
	version_id: string;
	/** A signed download URL, valid for 1 hour. Pass it to `downloadSnapshot()`. */
	url: string;
	/** The database engine or application language. It is `null` on old snapshots. */
	runtime?: string | null;
	/** Whether the snapshot was taken automatically or by hand, or `null` when unknown. */
	origin?: "automatic" | "manual" | null;
};

/**
 * The result of `snapshots.create()`.
 *
 * `pending` is `true` while a large snapshot is still being generated. It shows up in
 * `snapshots.list()` within about 2 minutes, so poll `list()` and do not call
 * `create()` again.
 */
export type SnapshotCreated =
	| { pending: true }
	| {
			pending: false;
			/**
			 * A signed download URL, valid for 1 hour. Pass it to `downloadSnapshot()`. It
			 * is `""` when your API key lacks the `snapshots:read` scope.
			 */
			url: string;
			/**
			 * The signed query string of `url`. It is `""` when your API key lacks the
			 * `snapshots:read` scope.
			 */
			key: string;
	  };

/**
 * The result of `snapshots.restore()`.
 *
 * `pending` is `true` when the restore took longer than about 90 seconds and is still
 * running. Follow it with `snapshots.restoreState()`, and do not call `restore()`
 * again.
 */
export type SnapshotRestored = { pending: boolean };

/** The progress of the latest snapshot restore. Timestamps are Unix times in milliseconds. */
export type SnapshotRestoreState = {
	/**
	 * `queued` or `running` while the restore runs, then `success` or `error` for 1 hour
	 * after it ends. `none` means there was no restore in the last hour.
	 */
	state: "none" | "queued" | "running" | "success" | "error";
	/** The current step while the restore runs, and `done` once it has ended. */
	step?: string;
	/** Why the restore failed, such as `SNAPSHOT_CORRUPT`. It is present when `state` is `error`. */
	code?: string;
	/** When the restore started. */
	started_at?: number;
	/** When the restore ended. It is present once `state` is `success` or `error`. */
	finished_at?: number;
};

// Apps

/** An application, as `apps.get()` returns it. */
export type App = {
	id: string;
	name: string;
	/** The description. It is omitted when the application has none. */
	desc?: string;
	/** The user id of the owner. */
	owner: string;
	/** The cluster that hosts the application. */
	cluster: string;
	/** The memory allocated to the application, in MB. */
	ram: number;
	/** The language, such as `javascript`, `python` or `static`. */
	language: string;
	/**
	 * The default `<subdomain>.squareweb.app` hostname. It is omitted or `null` when
	 * the application is not a website.
	 */
	domain?: string | null;
	/** The custom domain. It is omitted or `null` when none is set. */
	custom?: string | null;
	created_at: string;
};

/** The new application that `apps.create()` returns. */
export type AppCreated = {
	id: string;
	name: string;
	/** The description from the configuration file. It is omitted when unset. */
	description?: string;
	/**
	 * The full `<subdomain>.squareweb.app` hostname. It is omitted when the application
	 * is not a website.
	 */
	domain?: string;
	/** The cluster the application was deployed to. */
	cluster?: string;
	/** The memory allocated to the application, in MB. */
	ram: number;
	/** The CPU shares allocated to the application. */
	cpu: number;
	/**
	 * The detected language, such as `javascript`, and the `version` from the
	 * configuration file, such as `recommended` or `22`.
	 */
	language: { name: string; version: string };
};

/**
 * Whether one application or database is running, as `statusAll()` lists it. `cpu`
 * and `ram` are present only while it runs.
 */
export type StatusListItem = {
	id: string;
	running: boolean;
	/** The CPU usage, such as `"0.50%"`. */
	cpu?: string;
	/** The memory in use, such as `"120.40MB"`. */
	ram?: string;
};

/**
 * The current usage of an application or database, from `status()`. Values are
 * formatted strings by default and numbers with `{ raw: true }`.
 */
export type RuntimeStats<Raw extends boolean = false> = {
	/** The CPU usage, such as `"0.5%"`, or a percentage with `{ raw: true }`. */
	cpu: Raw extends true ? number : string;
	/** The memory in use, such as `"120.4MB"`, or a number of MB with `{ raw: true }`. */
	ram: Raw extends true ? number : string;
	/** The container state, such as `running` or `exited`. */
	status: string;
	running: boolean;
	/**
	 * `true` while a snapshot restore is queued or running. `status` keeps showing the
	 * container's own state.
	 */
	restoring?: boolean;
	/** The storage in use, as a formatted string, or a number of bytes with `{ raw: true }`. */
	storage: Raw extends true ? number : string;
	/**
	 * The network traffic, in total and right now. Each is a formatted string, or
	 * `[incoming, outgoing]` bytes with `{ raw: true }`.
	 */
	network: {
		total: Raw extends true ? [number, number] : string;
		now: Raw extends true ? [number, number] : string;
	};
	/**
	 * When the container last started, as a Unix timestamp in milliseconds. Despite its
	 * name, it is a point in time, not a length of time. It is `null` when stopped.
	 */
	uptime: number | null;
};

/** One point of `metrics()`. Points come newest first. */
export type MetricPoint = {
	date: string;
	/** The CPU usage, as a percentage of the plan's CPU. With `range: "7d"`, the hour's average. */
	cpu: number;
	/** The memory in use, in MB. With `range: "7d"`, the hour's average. */
	ram: number;
	/**
	 * `[received, sent]` bytes since the container started. The values only grow, so a
	 * drop means the container restarted.
	 */
	net: number[];
	/**
	 * `[read, written]` bytes since the container started, like `net`. It is `null` on a
	 * point without a reading.
	 */
	disk?: number[] | null;
	/** The bytes on the container's disk. It is `null` on a point without a reading. */
	storage?: number | null;
	/** The hour's CPU peak. It is present only with `range: "7d"`. */
	cpu_max?: number;
	/** The hour's memory peak. It is present only with `range: "7d"`. */
	ram_max?: number;
};

/** A hostname of one of your applications, from `apps.domains()`. */
export type AppDomain = {
	app_id: string;
	hostname: string;
	/** `subdomain` for the default `squareweb.app` hostname, or `custom`. */
	type: "subdomain" | "custom";
};

/** Your custom domains and the applications that serve each one, from `apps.loadBalancers()`. */
export type LoadBalancers = {
	/** How many applications can share one domain on your plan. */
	limit: number;
	/** One entry per custom domain, with the applications that serve it. */
	balancers: {
		hostname: string;
		apps: { id: string; name: string; cluster?: string }[];
	}[];
};

/** One event in the timeline of a Git deploy, from `deploys.list()`. */
export type DeployEvent = {
	/** The commit SHA. */
	id: string;
	state: "pending" | "clone" | "commit" | "restarting" | "success" | "error";
	date: string;
	/** Always `git`, because only deploys from a webhook or the GitHub App are recorded. */
	source: "git";
	/** The branch. It is present on `clone` events. */
	branch?: string;
	/** Why the deploy failed, such as `CLONE_FAILED`. It is present on `error` events. */
	code?: string;
	/** The details of the failure. It is present on some `error` events. */
	message?: string;
	/** The files the commit added, removed and modified. It is present on `commit` events. */
	files?: { added: string[]; removed: string[]; modified: string[] };
};

/** The GitHub App link that `deploys.current()` reports. */
export type DeployRepository = {
	id: number | null;
	/** The repository's full name, such as `octocat/hello-world`. */
	name: string | null;
	branch: string | null;
};

/** How Git deploys are set up, from `deploys.current()`. It is `{}` when nothing is set up. */
export type DeployCurrent = {
	/** The GitHub App link. */
	app?: DeployRepository;
	/**
	 * The webhook URL. It is masked unless your API key may configure the webhook,
	 * which needs the `apps:deploy` scope.
	 */
	webhook?: string;
};

/** The repository that `deploys.linkGithubApp()` linked. */
export type LinkedRepository = {
	/** The GitHub repository id. */
	id: number;
	/** The repository's full name, such as `octocat/hello-world`. */
	full_name: string;
	branch: string;
};

/** Environment variables, as names mapped to values. */
export type EnvVars = Record<string, string>;

/** A file or directory, from `files.list()`. */
export type FileEntry = {
	name: string;
	type: "file" | "directory";
	/** The size in bytes. Some directory entries omit it, such as one a commit just unpacked. */
	size?: number;
	/**
	 * When the entry was last modified, as a Unix timestamp in milliseconds that can
	 * have a fraction. It is `null` when unreadable, and omitted where `size` is.
	 */
	lastModified?: number | null;
};

/**
 * The content of `files.write()`. A string is written as text, and bytes are written
 * as they are. It can be at most 10 MB, and empty content creates an empty file.
 */
export type FileContent = string | Uint8Array;

// Realtime

/**
 * The live state of the container, from a realtime `status` event. The SDK merges each
 * partial update into the last full state, so every field stays present once sent.
 */
export type RealtimeStatus = {
	/** The CPU usage, as a percentage. */
	cpu?: number;
	/** The number of CPU cores allocated. */
	cpuLimit?: number;
	/** `[used, limit]` memory in MB. */
	ram?: [number, number];
	/** The container state, such as `running`. */
	status?: string;
	/**
	 * The network traffic: `i` bytes in and `o` bytes out in total, and the current
	 * rate in bytes per second in `new`.
	 */
	netIO?: { i: number; o: number; new?: { i: number; o: number } };
	/** The disk traffic: `i` bytes read and `o` bytes written. */
	bIO?: { i: number; o: number };
	/** When the container started, as a Unix timestamp in milliseconds. */
	uptime?: number;
};

/**
 * One event from `apps.realtime()`. Every event has `event`, `data` (the raw text the
 * API sent) and `id`.
 */
export type RealtimeEvent =
	| {
			event: "logs";
			data: string;
			id?: string;
			/** Whether the line came from standard output or standard error. */
			stream: "stdout" | "stderr";
			/** The log line. */
			line: string;
	  }
	| {
			event: "status";
			data: string;
			id?: string;
			/** The full, merged state of the container. */
			status: RealtimeStatus;
	  }
	/**
	 * `system` events carry a code in `data`, such as `REALTIME_CONNECTING | <id>`,
	 * `REALTIME_TIMEOUT` or `REALTIME_DISCONNECTED`. `error` events carry an error code,
	 * such as `CONTAINER_NOT_FOUND`. `message` is an event the API sent without a name.
	 */
	| { event: "system" | "error" | "message"; data: string; id?: string };

// Network

/**
 * The optional filters of `network.analytics()`. Each takes the exact `type` value of
 * an item in its breakdown. A malformed value throws 400 `INVALID_FILTER`.
 */
export type AnalyticsFilters = {
	/** A two-letter country code, such as `BR`. */
	country?: string;
	ip?: string;
	/** A path prefix, such as `/api`. */
	path?: string;
	/** A response status, such as `404`. */
	status?: string;
	os?: string;
	browser?: string;
	protocol?: string;
	/** A referer host. `Direct` matches requests without a referer. */
	referer?: string;
	/** A network, in the `"NAME (ASN)"` form of the `providers` breakdown, such as `GOOGLE (15169)`. */
	provider?: string;
	content_type?: string;
	bot?: string;
};

/** One item of a `network.analytics()` breakdown. */
export type AnalyticsBucket = {
	/** The value of the dimension, such as a country code. Providers use the `"NAME (ASN)"` form. */
	type: string;
	visits: number;
	requests: number;
	/** The response bytes served. */
	bytes: number;
	date?: string;
};

/** The traffic of a website in a time window, from `network.analytics()`. */
export type NetworkAnalytics = {
	/** The totals over time. */
	visits: {
		visits: number;
		requests: number;
		/** The response bytes served. */
		bytes: number;
		/** The request bytes received from visitors, such as uploads and request bodies. */
		bytes_in?: number;
		date: string;
	}[];
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

/** The HTTP errors a website served in a time window, from `network.errors()`. */
export type NetworkErrors = {
	summary: { total: number; by_class: { "4xx": number; "5xx": number } };
	by_status: { status: number; requests: number }[];
	/** The errors over time, with the count of each status in `buckets`. */
	timeseries: {
		date: string;
		buckets: Record<string, number>;
		total: number;
	}[];
	/** The paths with the most errors. */
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

/** One request to a website, from `network.logs()`. */
export type NetworkLog = {
	timestamp: string;
	client: {
		ip: string | null;
		country: string | null;
		location: string | null;
		/** The client's network number. */
		asn: string;
		/** The user agent. */
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

/** Response time percentiles in milliseconds. Each is `null` when the window has no requests. */
export type Percentiles = {
	p50: number | null;
	p95: number | null;
	p99: number | null;
};

/**
 * The response times of a website in a time window, from `network.performance()`.
 * `edge` is the time to the first byte at the edge, and `origin` is your application's
 * response time. Times are in milliseconds.
 */
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
	/** The edge locations that served the requests. */
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

/** A DNS record to create at your domain registrar, from `network.dns()`. */
export type DNSRecord = {
	type: "txt" | "cname";
	name: string;
	value: string;
	/** The validation state, such as `pending` or `active`. */
	status: string;
	/**
	 * Why the record is not active yet, as at most 3 messages in English. It is present
	 * only on a record that is not `active`.
	 */
	errors?: string[];
	/**
	 * `true` on the one `_acme-challenge` CNAME record that you can create instead of
	 * every SSL TXT record.
	 */
	fallback?: boolean;
};

// Databases

/** A database engine: MongoDB, MySQL, Redis or PostgreSQL. */
export type DatabaseType = "mongo" | "mysql" | "redis" | "postgres";

/** A database, as `databases.get()` returns it. */
export type Database = {
	id: string;
	name: string;
	/** The user id of the owner. */
	owner: string;
	/** The cluster that hosts the database. */
	cluster: string;
	/** The memory allocated to the database, in MB. */
	ram: number;
	type: DatabaseType;
	/** The TCP port the database listens on. */
	port: number;
	created_at: string;
};

/** The database that `databases.create()` creates. */
export type DatabaseCreate = {
	/** The name, 1 to 32 characters. */
	name: string;
	/**
	 * The memory in MB, as a whole number. A fraction or a string throws 400
	 * `INVALID_MEMORY`.
	 */
	memory: number;
	type: DatabaseType;
	/** A full engine version, or a prefix such as `"8"`. */
	version: string;
};

/** The new database that `databases.create()` returns. */
export type DatabaseCreated = {
	id: string;
	name: string;
	/** The memory allocated to the database, in MB. */
	memory: number;
	/** The CPU shares allocated to the database. */
	cpu: number;
	type: DatabaseType;
	/** The password. Only this result and `resetCredentials()` return it, so store it. */
	password: string;
	/**
	 * The base64-encoded PEM, with the private key followed by the certificate. It is
	 * `null` when it could not be produced.
	 */
	certificate?: string | null;
	/** A connection string with the password included. */
	connection_url: string;
	/** The cluster that hosts the database. */
	cluster: string;
};

/** The changes `databases.update()` applies. Pass at least one field. */
export type DatabaseUpdate = {
	name?: string;
	/** The new memory, in MB. */
	ram?: number;
};

// Workspaces

/** The new workspace that `workspaces.create()` returns. */
export type WorkspaceCreated = { id: string; name: string };

/**
 * A member's role in a workspace. `admin` can manage everything. `maintain` can also
 * commit, start and stop applications, and manage files, DNS and the cache.
 * `manager` can monitor applications and start and stop them. `view` can only read.
 */
export type WorkspaceGroup = "admin" | "maintain" | "manager" | "view";

/** A workspace, with its members and shared applications. */
export type Workspace = {
	/** 32 hexadecimal characters. Older workspaces keep a 40-character id. */
	id: string;
	name: string;
	/** The user id of the owner. */
	owner: string;
	members: {
		/** The member's user id. */
		id: string;
		/** The member's name, or `null` when it cannot be found, such as for a deleted account. */
		name: string | null;
		group: WorkspaceGroup | "owner";
		joinedAt: string;
	}[];
	applications: {
		id: string;
		name: string;
		/** The description, or `null` when unset. */
		desc: string | null;
		/** The memory allocated to the application, in MB. */
		ram: number;
		/** The language, such as `javascript`. */
		lang: string;
		/** The default hostname. It is omitted or `null` when the application is not a website. */
		domain?: string | null;
		/** The custom domain. It is omitted or `null` when none is set. */
		custom?: string | null;
	}[];
	createdAt: string;
};

// AI (OpenAI-compatible, non-streaming)

/** A message of a chat, in the OpenAI format. */
export type ChatMessage = {
	role: "system" | "user" | "assistant" | "tool";
	content?: string;
	tool_call_id?: string;
	tool_calls?: Record<string, unknown>[];
};

/** The request of `ai.chat()`, in the OpenAI format. */
export type ChatRequest = {
	model?: string;
	messages: ChatMessage[];
	tools?: Record<string, unknown>[];
	tool_choice?:
		| "auto"
		| "none"
		| "required"
		| { type: "function"; function: { name: string } };
	/**
	 * The most tokens the completion can use, lowered to your plan's maximum when
	 * higher. It takes precedence over `max_tokens`.
	 */
	max_completion_tokens?: number;
	/** The older name of `max_completion_tokens`. */
	max_tokens?: number;
	temperature?: number;
};

/** The completion that `ai.chat()` returns, in the OpenAI format. */
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
