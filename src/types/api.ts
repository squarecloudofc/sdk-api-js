import type {
	APIApplication,
	APIApplicationBackup,
	APIApplicationLogs,
	APIApplicationStatus,
	APIApplicationStatusAll,
	APIDeployment,
	APIDeploymentCurrent,
	APIListedFile,
	APINetworkAnalytics,
	APINetworkDNS,
	APIPayload,
	APIReadFile,
	APIServiceStatus,
	APIUserInfo,
	APIWebsiteApplication,
	RESTDeleteAPIFileDeleteQuery,
	RESTGetAPIFileContentQuery,
	RESTGetAPIFilesListQuery,
	RESTPatchAPIFileMoveJSONBody,
	RESTPostAPIApplicationBackupResult,
	RESTPostAPIApplicationCommitQuery,
	RESTPostAPIApplicationUploadResult,
	RESTPostAPIGithubWebhookJSONBody,
	RESTPostAPIGithubWebhookResult,
	RESTPostAPINetworkCustomDomainJSONBody,
	RESTPutAPIFileUpsertJSONBody,
} from "@squarecloud/api-types/v2";

export interface APIApplicationEndpoints {
	"": APIApplication | APIWebsiteApplication;
	upload: RESTPostAPIApplicationUploadResult;
	status: APIApplicationStatus;
	logs: APIApplicationLogs;
	backups: RESTPostAPIApplicationBackupResult;
	"files/list": APIListedFile[];
	"files/read": APIReadFile;
	"all/status": APIApplicationStatusAll[];
	"network/analytics": APINetworkAnalytics;
	"deploys/list": APIDeployment[];
	"deploy/git-webhook": RESTPostAPIGithubWebhookResult;
}

export interface APIEndpoints {
	user: {
		response: APIUserInfo;
	};
	"service/status": {
		response: APIServiceStatus;
	};
	"apps/upload": {
		body: Buffer;
		response: RESTPostAPIApplicationUploadResult;
	};
	"apps/status-all": {
		response: APIApplicationStatusAll[];
	};
	"apps/info": {
		response: APIApplication;
	};
	"apps/status": {
		response: APIApplicationStatus;
	};
	"apps/logs": {
		response: APIApplicationLogs;
	};
	"apps/backups": {
		response: APIApplicationBackup[];
	};
	"apps/generate-backup": {
		response: RESTPostAPIApplicationBackupResult;
	};
	"apps/start": {
		response: undefined;
	};
	"apps/restart": {
		response: undefined;
	};
	"apps/stop": {
		response: undefined;
	};
	"apps/delete": {
		response: undefined;
	};
	"apps/commit": {
		query: RESTPostAPIApplicationCommitQuery;
		body: Buffer;
		response: undefined;
	};
	"apps/files/read": {
		query: RESTGetAPIFileContentQuery;
		response: APIReadFile;
	};
	"apps/files/list": {
		query: RESTGetAPIFilesListQuery;
		response: APIListedFile[];
	};
	"apps/files/upsert": {
		body: RESTPutAPIFileUpsertJSONBody;
		response: undefined;
	};
	"apps/files/move": {
		body: RESTPatchAPIFileMoveJSONBody;
		response: undefined;
	};
	"apps/files/delete": {
		query: RESTDeleteAPIFileDeleteQuery;
		response: undefined;
	};
	"apps/deployments/list": {
		response: APIDeployment[];
	};
	"apps/deployments/current": {
		response: APIDeploymentCurrent;
	};
	"apps/deployments/webhook": {
		body: RESTPostAPIGithubWebhookJSONBody;
		response: RESTPostAPIGithubWebhookResult;
	};
	"apps/network/dns": {
		response: APINetworkDNS[];
	};
	"apps/network/analytics": {
		response: APINetworkAnalytics;
	};
	"apps/network/custom": {
		body: RESTPostAPINetworkCustomDomainJSONBody;
		response: undefined;
	};
}

export type APIEndpoint = keyof APIEndpoints;

export type APIRequestOptions<
	T extends APIEndpoint,
	U extends APIEndpoints[T] = APIEndpoints[T],
> = Omit<U, "response"> & {
	method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
	headers?: HeadersInit;
};

export type APIResponse<T extends APIEndpoint> = APIPayload<
	APIEndpoints[T]["response"]
>;
