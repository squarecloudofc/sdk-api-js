import {
  APIApplication,
  APIApplicationBackup,
  APIApplicationLogs,
  APIApplicationStatus,
  APIApplicationStatusAll,
  APIDeploy,
  APIListedFile,
  APINetworkAnalytics,
  APIReadFile,
  APIWebsiteApplication,
  RESTPostAPIApplicationUploadResult,
} from "@squarecloud/api-types/v2";

export interface APIApplicationEndpoints {
  "": APIApplication | APIWebsiteApplication;
  upload: RESTPostAPIApplicationUploadResult;
  status: APIApplicationStatus;
  logs: APIApplicationLogs;
  backup: APIApplicationBackup;
  "files/list": APIListedFile[];
  "files/read": APIReadFile;
  "all/status": APIApplicationStatusAll[];
  "network/analytics": APINetworkAnalytics;
  "deploys/list": APIDeploy[];
}
