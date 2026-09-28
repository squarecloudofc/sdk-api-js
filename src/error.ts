/**
 * Error codes of the Square Cloud API (every code of the spec's `ErrorCode` enum), the
 * deprecated rate-limit codes and the SDK's own. The list grows: treat an unknown code
 * as a generic failure of its HTTP status. The AI route uses lowercase OpenAI codes
 * (`access_denied`, `rate_limit_exceeded`, `server_overloaded`, ...).
 */
export type ErrorCode =
	| "ACCESS_DENIED"
	| "ACTION_FAILED"
	| "AI_DAILY_LIMIT_REACHED"
	| "AI_MAX_CONCURRENT_STREAMS"
	| "AI_NO_PLAN_LIMIT_REACHED"
	| "AI_UNAVAILABLE"
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
	/** 503, on every route: retried on GET only. It can fire mid-handler, so a mutation may already be applied; retry your idempotent mutations yourself. */
	| "DATABASE_UNAVAILABLE"
	| "DELETE_FAILED"
	| "DNS_FAILED"
	| "DOMAIN_ALREADY_EXISTS"
	| "EMPTY_RESPONSE"
	| "ENV_CONTENT_TOO_LONG"
	| "ENV_NAME_TOO_LONG"
	/** 502 on `linkGithubApp`: GitHub did not confirm the branch; safe to retry. */
	| "FAILED_TO_FETCH"
	| "FILE_NOT_FOUND"
	| "FILE_TOO_LARGE"
	| "GIT_ALREADY_CONFIGURED"
	| "GIT_NOT_CONFIGURED"
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
	| "METRICS_NOT_SUPPORTED"
	| "MISSING_PARAMETERS"
	| "MISSING_REQUIRED_FIELDS"
	| "MISSING_SCOPE"
	| "NO_CUSTOM_DOMAIN"
	| "NO_UPDATE_DATA"
	| "PAYLOAD_TOO_LARGE"
	| "PERMISSION_DENIED"
	| "PURGE_CACHE_FAILED"
	/** 429: the account/API-key/IP block (can last ~30 min), and the limit of the app network endpoints and `GET /v2/users/snapshots`. Never retried. */
	| "RATE_LIMITED"
	| "READ_FAILED"
	| "REALTIME_MAX_CONNECTIONS"
	| "REALTIME_MAX_CONNECTIONS_APP"
	| "RENAME_FAILED"
	| "REPOSITORY_BRANCH_ALREADY_CONFIGURED"
	| "REPOSITORY_NOT_AVAILABLE"
	| "REPOSITORY_NOT_FOUND"
	/** 403: the linked GitHub account has no write access to the repository. */
	| "REPOSITORY_PERMISSION_REQUIRED"
	| "REQUEST_ABORTED"
	| "RESERVED_DOMAIN"
	| "RESET_FAILED"
	| "RESOURCE_NOT_ALLOWED"
	| "RESTORE_IN_PROGRESS"
	| "ROUTE_NOT_FOUND"
	| "SAVE_FAILED"
	| "SCOPE_NOT_GRANTABLE"
	| "SNAPSHOT_DATABASE_MISMATCH"
	| "SNAPSHOT_FAILED"
	| "SNAPSHOT_NOT_FOUND"
	| "SNAPSHOT_PROCESSING"
	| "SNAPSHOT_RESTORE_FAILED"
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
	// Deprecated: both are now RATE_LIMITED
	| "RATE_LIMIT"
	| "RATE_LIMIT_EXCEEDED"
	// SDK: no response, or a body without a code (e.g. a proxy error page)
	| "NETWORK_ERROR"
	| "TIMEOUT"
	| "UNKNOWN_ERROR"
	| (string & {});

export class SquareCloudAPIError extends Error {
	override name = "SquareCloudAPIError";
	/** HTTP status; `0` when no response arrived (network error, timeout, local check). */
	readonly status: number;
	/** API error code, e.g. `APP_NOT_FOUND`. The server's explanation is in `message`. */
	readonly code: ErrorCode;
	/** HTTP method of the failed call. */
	readonly method: string;
	/** URL path of the failed call, e.g. `/v2/apps/<id>/status`. */
	readonly path: string;

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
