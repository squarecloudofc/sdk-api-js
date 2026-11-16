/**
 * The error codes that {@link SquareCloudAPIError.code} can hold.
 *
 * The union lists every code the Square Cloud API documents, the deprecated codes it
 * replaced, and the codes the SDK produces itself. The API can add codes, so treat an
 * unknown code as a generic failure of its HTTP status. Errors from `ai.chat()` use
 * lowercase OpenAI codes instead, such as `access_denied`, `rate_limit_exceeded`,
 * `weekly_limit_reached` and `server_overloaded`.
 */
export type ErrorCode =
	| "ACCESS_DENIED"
	| "ACTION_FAILED"
	| "AI_DAILY_LIMIT_REACHED"
	| "AI_MAX_CONCURRENT_STREAMS"
	| "AI_NO_PLAN_LIMIT_REACHED"
	| "AI_UNAVAILABLE"
	| "AI_WEEKLY_LIMIT_REACHED"
	| "ANALYTICS_BUSY"
	| "APPLICATIONS_LIMIT_REACHED"
	| "APP_ALREADY_IN_WORKSPACE"
	| "APP_NOT_FOUND"
	| "BLOCKED_PATH"
	| "BRANCH_NOT_FOUND"
	| "CANNOT_EDIT_OWNER"
	| "CANNOT_INVITE_OWNER"
	| "CANNOT_LEAVE_OWNER"
	| "CANNOT_SET_SUBDOMAIN"
	| "CLUSTER_MAINTENANCE_TRY_LATER"
	| "CLUSTER_SELECTION_FAILED"
	| "CLUSTER_TIMEOUT"
	| "CLUSTER_UNAVAILABLE"
	| "COMMIT_FAILED"
	| "CONFLICTING_RESOURCES"
	| "CONTAINER_ALREADY_STARTED"
	| "CONTAINER_ALREADY_STOPPED"
	| "CONTAINER_INSUFFICIENT_DISK_SPACE"
	| "CONTAINER_NETWORK_CONFLICT"
	| "CONTAINER_NOT_FOUND"
	| "CONTAINER_TEMPORARILY_SUSPENDED"
	| "DAILY_SNAPSHOTS_LIMIT_REACHED"
	| "DATABASE_CREATION_FAILED"
	| "DATABASE_NOT_FOUND"
	| "DATABASE_NOT_RUNNING"
	/**
	 * 503 when the service is briefly unavailable. Any call can answer it. The SDK
	 * retries GET calls only, because a change may already have been applied, so retry
	 * your own idempotent changes yourself.
	 */
	| "DATABASE_UNAVAILABLE"
	| "DELETE_FAILED"
	| "DNS_FAILED"
	| "DOMAIN_ALREADY_EXISTS"
	| "EMPTY_RESPONSE"
	/**
	 * 409 from `envs.set()`, `envs.replace()` and `envs.delete()` when another request
	 * is changing the variables. Try again in a moment. The SDK does not retry it.
	 */
	| "ENV_BUSY"
	| "ENV_CONTENT_TOO_LONG"
	| "ENV_NAME_TOO_LONG"
	/**
	 * 502 from `deploys.linkGithubApp()` when GitHub did not confirm the branch. It is
	 * safe to try again.
	 */
	| "FAILED_TO_FETCH"
	| "FILE_NOT_FOUND"
	/**
	 * 413 from the API for a file over 10 MB. The SDK also throws it with status 0,
	 * before sending, for an upload over 100 MB or a `files.write()` over 10 MB.
	 */
	| "FILE_TOO_LARGE"
	| "GIT_ALREADY_CONFIGURED"
	| "GIT_BRANCH_DELETED"
	| "GIT_NOT_CONFIGURED"
	| "GIT_REF_NOT_SUPPORTED"
	| "GITHUB_NOT_CONNECTED"
	| "INSUFFICIENT_MEMORY"
	| "INTERNAL_SERVER_ERROR"
	| "INVALID_ACCESS_TOKEN"
	| "INVALID_AUTORESTART"
	| "INVALID_BRANCH_LENGTH"
	| "INVALID_CODE"
	| "INVALID_CONTENT"
	| "INVALID_CONTENT_TYPE"
	| "INVALID_DATABASE_TYPE"
	| "INVALID_DATABASE_VERSION"
	| "INVALID_DESCRIPTION"
	| "INVALID_DISPLAY_NAME"
	| "INVALID_DOMAIN"
	| "INVALID_ENCODING"
	| "INVALID_ENV_CONTENT"
	| "INVALID_FILE"
	| "INVALID_FILENAME"
	| "INVALID_FILTER"
	| "INVALID_GROUP"
	/**
	 * 400 from the API for a malformed id. The SDK also throws it with status 0, before
	 * sending, for an id that is empty, `.` or `..`.
	 */
	| "INVALID_ID"
	| "INVALID_INPUT"
	| "INVALID_JSON_BODY"
	| "INVALID_MEMORY"
	| "INVALID_NAME"
	| "INVALID_PARAMETERS"
	| "INVALID_PATH"
	| "INVALID_RESET_TYPE"
	| "INVALID_SCOPE"
	| "INVALID_SNAPSHOT_ID"
	| "INVALID_SUBDOMAIN"
	| "INVALID_TIME_RANGE"
	| "INVALID_VERSION_ID"
	| "KEEP_CALM"
	| "LOAD_BALANCER_LIMIT_REACHED"
	| "LOGS_UNAVAILABLE"
	| "MEMBERS_LIMIT_REACHED"
	| "MEMBER_ALREADY_ADDED"
	| "MEMBER_NOT_FOUND"
	| "MISSING_PARAMETERS"
	| "MISSING_REQUIRED_FIELDS"
	| "MISSING_SCOPE"
	| "NO_CUSTOM_DOMAIN"
	| "NO_UPDATE_DATA"
	| "PAYLOAD_TOO_LARGE"
	| "PERMISSION_DENIED"
	| "PURGE_CACHE_FAILED"
	/**
	 * 429 when you exceed a rate limit. It can block your account, API key or IP for
	 * about 30 minutes, and it is also the limit of the `apps.network` methods and of
	 * `account.snapshots()`. The SDK never retries it.
	 */
	| "RATE_LIMITED"
	| "READ_FAILED"
	| "REALTIME_MAX_CONNECTIONS"
	| "REALTIME_MAX_CONNECTIONS_APP"
	| "RENAME_FAILED"
	| "REPOSITORY_BRANCH_ALREADY_CONFIGURED"
	| "REPOSITORY_NOT_AVAILABLE"
	| "REPOSITORY_NOT_FOUND"
	/** 403 when your connected GitHub account has no write access to the repository. */
	| "REPOSITORY_PERMISSION_REQUIRED"
	| "REQUEST_ABORTED"
	| "RESERVED_DOMAIN"
	| "RESET_FAILED"
	| "RESOURCE_NOT_ALLOWED"
	/**
	 * 409 from delete, start, stop, restart, snapshot create and snapshot restore while a
	 * snapshot is being restored. Try again when the restore ends. The SDK does not
	 * retry it. The API used to answer 403 on delete and on database start and stop.
	 */
	| "RESTORE_IN_PROGRESS"
	| "RESTORE_INTERRUPTED"
	| "ROUTE_NOT_FOUND"
	| "SAVE_FAILED"
	| "SCOPE_NOT_GRANTABLE"
	| "SNAPSHOT_CORRUPT"
	| "SNAPSHOT_DATABASE_MISMATCH"
	| "SNAPSHOT_FAILED"
	| "SNAPSHOT_IN_PROGRESS"
	| "SNAPSHOT_NOT_FOUND"
	| "SNAPSHOT_PROCESSING"
	| "SNAPSHOT_RESTORE_FAILED"
	/**
	 * Never thrown. When a restore is still running, `snapshots.restore()` resolves to
	 * `{ pending: true }` instead.
	 */
	| "SNAPSHOT_RESTORE_PROCESSING"
	/**
	 * 503 from snapshot listings when snapshot storage cannot answer. Try again in about
	 * 30 seconds. The SDK does not retry it.
	 */
	| "SNAPSHOTS_UNAVAILABLE"
	| "STATIC_APP_ENV_NOT_SUPPORTED"
	| "STORAGE_UPLOAD_FAILED"
	| "TOO_MANY_ENV_VARS"
	| "UNABLE_TO_FETCH_ANALYTICS"
	| "UNABLE_TO_FETCH_ERRORS"
	| "UNABLE_TO_FETCH_PERFORMANCE"
	| "UPGRADE_REQUIRED"
	| "UPLOAD_ABORTED"
	| "UPLOAD_BUSY"
	| "UPLOAD_FAILED"
	| "VALIDATION_FAILED"
	| "VALIDATION_TIMEOUT"
	| "WORKSPACE_CREATION_FAILED"
	| "WORKSPACE_LIMIT_REACHED"
	| "WORKSPACE_NOT_FOUND"
	| "WRITE_FAILED"
	/** 421. No method of this SDK receives it. It is listed because the API documents it. */
	| "WRONG_HOST"
	// Deprecated codes. The API no longer sends them, and they stay so that existing
	// code keeps compiling.
	/** @deprecated The API now sends `RATE_LIMITED` instead. */
	| "RATE_LIMIT"
	/** @deprecated The API now sends `RATE_LIMITED` instead. */
	| "RATE_LIMIT_EXCEEDED"
	/** @deprecated The API no longer sends it, because every application now has metrics. */
	| "METRICS_NOT_SUPPORTED"
	// Codes the SDK produces itself, with status 0 unless noted.
	/** No complete response arrived, for example because of a DNS failure or a dropped connection. */
	| "NETWORK_ERROR"
	/** No response arrived within the timeout. */
	| "TIMEOUT"
	/**
	 * A failed response without an error code, such as a proxy error page, or a
	 * successful response whose body is not valid JSON. It keeps the real HTTP status.
	 */
	| "UNKNOWN_ERROR"
	| (string & {});

/**
 * The error every failed call throws, whether the API refused it, the network failed,
 * it timed out, or a local check stopped it before sending.
 *
 * Check `status` and `code` to decide what to do. `message` holds the API's
 * explanation when it sent one, and the code otherwise. `cause` holds the original
 * error of a network failure or of a successful response that is not valid JSON.
 *
 * Two failures are not wrapped. Cancelling a call with its `signal` rejects with the
 * signal's reason, and an upload path that cannot be opened throws the file-system
 * error.
 *
 * @example
 * ```ts
 * try {
 *   await api.apps.start(appId);
 * } catch (error) {
 *   if (error instanceof SquareCloudAPIError && error.code === "CONTAINER_ALREADY_STARTED") {
 *     console.log("The application is already running.");
 *   } else {
 *     throw error;
 *   }
 * }
 * ```
 */
export class SquareCloudAPIError extends Error {
	override name = "SquareCloudAPIError";
	/**
	 * The HTTP status of the response, or `0` when no response arrived because of a
	 * network error, a timeout or a local check.
	 */
	readonly status: number;
	/**
	 * The error code, such as `APP_NOT_FOUND`. It comes from the API, or from the SDK
	 * for failures without a response. See {@link ErrorCode}.
	 */
	readonly code: ErrorCode;
	/** The HTTP method of the failed call, such as `GET`. */
	readonly method: string;
	/**
	 * The URL path of the failed call, including the API's base path. It never
	 * includes the query string, so a signed link never leaks into logs.
	 */
	readonly path: string;

	/**
	 * Creates an error. The SDK creates these for you, so you only need the
	 * constructor to build errors in your own tests.
	 *
	 * @param status - The HTTP status, or `0` when there was no response.
	 * @param code - The error code.
	 * @param message - The explanation. When it is empty, the message is the code.
	 * @param method - The HTTP method.
	 * @param path - The URL path, without the query string.
	 * @param options.cause - The original error, if any.
	 */
	constructor(
		status: number,
		code: ErrorCode,
		message: string | undefined,
		method: string,
		path: string,
		options?: { cause?: unknown },
	) {
		super(message || code, options);
		this.status = status;
		this.code = code;
		this.method = method;
		this.path = path;
	}
}
