import type {
  APIApplication,
  APIApplicationLogs,
  APIApplicationStatus,
  APIApplicationStatusAll,
  APIDatabase,
  APIDatabaseCertificate,
  APIDatabaseCreated,
  APIDatabaseCredentialsResetPasswordResponse,
  APIDatabaseStatusListItem,
  APIDeploymentCurrent,
  APIDeployPayload,
  APIEnvVars,
  APIGithubAppLinkResponse,
  APIListedFile,
  APIMetrics,
  APINetworkAnalytics,
  APINetworkDNS,
  APINetworkErrors,
  APINetworkLogs,
  APINetworkPerformance,
  APIPayload,
  APIReadFile,
  APIServiceStatus,
  APISnapshot,
  APIUserInfo,
  APIWorkspace,
  APIWorkspaceCreatedResponse,
  APIWorkspaceInviteCodeResponse,
  RESTAPINetworkErrorsQuery,
  RESTDeleteAPIEnvVarsJSONBody,
  RESTDeleteAPIFileDeleteQuery,
  RESTDeleteAPIWorkspaceApplicationsJSONBody,
  RESTDeleteAPIWorkspaceJSONBody,
  RESTDeleteAPIWorkspaceLeaveJSONBody,
  RESTDeleteAPIWorkspaceMembersJSONBody,
  RESTGetAPIApplicationStatusAllQuery,
  RESTGetAPIFileContentQuery,
  RESTGetAPIFilesListQuery,
  RESTGetAPINetworkAnalyticsQuery,
  RESTGetAPINetworkLogsQuery,
  RESTGetAPINetworkPerformanceQuery,
  RESTGetAPIUserSnapshotsQuery,
  RESTPatchAPIDatabaseJSONBody,
  RESTPatchAPIFileMoveJSONBody,
  RESTPatchAPIWorkspaceMembersJSONBody,
  RESTPostAPIApplicationUploadResult,
  RESTPostAPIDatabaseCredentialsResetJSONBody,
  RESTPostAPIDatabaseJSONBody,
  RESTPostAPIEnvVarsJSONBody,
  RESTPostAPIGithubAppJSONBody,
  RESTPostAPIGithubWebhookJSONBody,
  RESTPostAPIGithubWebhookResult,
  RESTPostAPINetworkCustomDomainJSONBody,
  RESTPostAPINetworkPurgeCacheJSONBody,
  RESTPostAPISnapshotRestoreJSONBody,
  RESTPostAPISnapshotResult,
  RESTPostAPIWorkspaceApplicationsJSONBody,
  RESTPostAPIWorkspaceJSONBody,
  RESTPostAPIWorkspaceMembersJSONBody,
  RESTPutAPIEnvVarsJSONBody,
  RESTPutAPIFileUpsertJSONBody,
} from "@squarecloud/api-types/v2";

import type { Route } from "@/lib/routes";

export interface APIEndpoints {
  user: {
    response: APIUserInfo;
  };
  "user/snapshots": {
    query: RESTGetAPIUserSnapshotsQuery;
    response: APISnapshot[];
  };
  "service/status": {
    response: APIServiceStatus;
  };
  "apps/upload": {
    method: "POST";
    body: FormData;
    response: RESTPostAPIApplicationUploadResult;
  };
  "apps/status-all": {
    query?: RESTGetAPIApplicationStatusAllQuery;
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
  "apps/metrics": {
    response: APIMetrics;
  };
  "apps/realtime": {
    response: undefined;
  };
  "apps/snapshots": {
    response: APISnapshot[];
  };
  "apps/generate-snapshot": {
    method: "POST";
    response: RESTPostAPISnapshotResult;
  };
  "apps/restore-snapshot": {
    method: "POST";
    body: RESTPostAPISnapshotRestoreJSONBody;
    response: undefined;
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
    body: FormData;
    response: undefined;
  };
  "apps/envs/list": {
    response: APIEnvVars;
  };
  "apps/envs/set": {
    method: "POST";
    body: RESTPostAPIEnvVarsJSONBody;
    response: APIEnvVars;
  };
  "apps/envs/replace": {
    method: "PUT";
    body: RESTPutAPIEnvVarsJSONBody;
    response: APIEnvVars;
  };
  "apps/envs/delete": {
    method: "DELETE";
    body: RESTDeleteAPIEnvVarsJSONBody;
    response: APIEnvVars;
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
    body: RESTDeleteAPIFileDeleteQuery;
    response: undefined;
  };
  "apps/deployments/list": {
    response: APIDeployPayload["response"];
  };
  "apps/deployments/current": {
    response: APIDeploymentCurrent;
  };
  "apps/deployments/webhook": {
    method: "POST";
    body: RESTPostAPIGithubWebhookJSONBody;
    response: RESTPostAPIGithubWebhookResult;
  };
  "apps/deployments/github-app/link": {
    method: "POST";
    body: RESTPostAPIGithubAppJSONBody;
    response: APIGithubAppLinkResponse;
  };
  "apps/deployments/github-app/unlink": {
    method: "DELETE";
    response: undefined;
  };
  "apps/network/dns": {
    response: APINetworkDNS;
  };
  "apps/network/analytics": {
    query: RESTGetAPINetworkAnalyticsQuery;
    response: APINetworkAnalytics | Record<string, never>;
  };
  "apps/network/custom": {
    method: "POST";
    body: RESTPostAPINetworkCustomDomainJSONBody;
    response: undefined;
  };
  "apps/network/errors": {
    query: RESTAPINetworkErrorsQuery;
    response: APINetworkErrors | Record<string, never>;
  };
  "apps/network/logs": {
    query: RESTGetAPINetworkLogsQuery;
    response: APINetworkLogs;
  };
  "apps/network/performance": {
    query: RESTGetAPINetworkPerformanceQuery;
    response: APINetworkPerformance | Record<string, never>;
  };
  "apps/network/purge-cache": {
    method: "POST";
    body: RESTPostAPINetworkPurgeCacheJSONBody;
    response: undefined;
  };
  "databases/create": {
    method: "POST";
    body: RESTPostAPIDatabaseJSONBody;
    response: APIDatabaseCreated;
  };
  "databases/status-all": {
    response: APIDatabaseStatusListItem[];
  };
  "databases/info": {
    response: APIDatabase;
  };
  "databases/delete": {
    method: "DELETE";
    response: undefined;
  };
  "databases/update": {
    method: "PATCH";
    body: RESTPatchAPIDatabaseJSONBody;
    response: undefined;
  };
  "databases/status": {
    response: APIApplicationStatus;
  };
  "databases/metrics": {
    response: APIMetrics;
  };
  "databases/start": {
    method: "POST";
    response: undefined;
  };
  "databases/stop": {
    method: "POST";
    response: undefined;
  };
  "databases/credentials/certificate": {
    response: APIDatabaseCertificate;
  };
  "databases/credentials/reset": {
    method: "POST";
    body: RESTPostAPIDatabaseCredentialsResetJSONBody;
    response: APIDatabaseCredentialsResetPasswordResponse;
  };
  "databases/snapshots/list": {
    response: APISnapshot[];
  };
  "databases/snapshots/create": {
    method: "POST";
    response: RESTPostAPISnapshotResult;
  };
  "databases/snapshots/restore": {
    method: "POST";
    body: RESTPostAPISnapshotRestoreJSONBody;
    response: undefined;
  };
  "workspaces/list": {
    response: APIWorkspace[];
  };
  "workspaces/create": {
    method: "POST";
    body: RESTPostAPIWorkspaceJSONBody;
    response: APIWorkspaceCreatedResponse;
  };
  "workspaces/delete": {
    method: "DELETE";
    body: RESTDeleteAPIWorkspaceJSONBody;
    response: undefined;
  };
  "workspaces/info": {
    response: APIWorkspace;
  };
  "workspaces/leave": {
    method: "DELETE";
    body: RESTDeleteAPIWorkspaceLeaveJSONBody;
    response: undefined;
  };
  "workspaces/applications/add": {
    method: "POST";
    body: RESTPostAPIWorkspaceApplicationsJSONBody;
    response: undefined;
  };
  "workspaces/applications/remove": {
    method: "DELETE";
    body: RESTDeleteAPIWorkspaceApplicationsJSONBody;
    response: undefined;
  };
  "workspaces/members/add": {
    method: "POST";
    body: RESTPostAPIWorkspaceMembersJSONBody;
    response: undefined;
  };
  "workspaces/members/update": {
    method: "PATCH";
    body: RESTPatchAPIWorkspaceMembersJSONBody;
    response: undefined;
  };
  "workspaces/members/remove": {
    method: "DELETE";
    body: RESTDeleteAPIWorkspaceMembersJSONBody;
    response: undefined;
  };
  "workspaces/members/invite-code": {
    response: APIWorkspaceInviteCodeResponse;
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

export type QueryOrBody =
  | { query: any }
  | { body: any }
  | { method: APIMethod };

export type APIRequestArgs<
  T extends APIEndpoint,
  U extends APIRequestOptions<T> = APIRequestOptions<T>,
> = U extends QueryOrBody
  ? [path: Route<T>, options: U]
  : [path: Route<T>, options?: U];
