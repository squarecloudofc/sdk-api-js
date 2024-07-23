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
		method: "POST";
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
		method: "POST";
		response: RESTPostAPIApplicationBackupResult;
	};
	"apps/start": {
		method: "POST";
		response: undefined;
	};
	"apps/restart": {
		method: "POST";
		response: undefined;
	};
	"apps/stop": {
		method: "POST";
		response: undefined;
	};
	"apps/delete": {
		method: "DELETE";
		response: undefined;
	};
	"apps/commit": {
		method: "POST";
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
		method: "PUT";
		body: RESTPutAPIFileUpsertJSONBody;
		response: undefined;
	};
	"apps/files/move": {
		method: "PATCH";
		body: RESTPatchAPIFileMoveJSONBody;
		response: undefined;
	};
	"apps/files/delete": {
		method: "DELETE";
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
		method: "POST";
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
		method: "POST";
		body: RESTPostAPINetworkCustomDomainJSONBody;
		response: undefined;
	};
}

export type APIEndpoint = keyof APIEndpoints;

export type APIMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type APIRequestOptions<T extends APIEndpoint> = {
	headers?: HeadersInit;
} & Omit<APIEndpoints[T], "response">;

export type APIResponse<T extends APIEndpoint> = APIPayload<
	APIEndpoints[T]["response"]
>;
