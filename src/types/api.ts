import {
  APIApplication,
  APIApplicationBackup,
  APIApplicationLogs,
  APIApplicationStatus,
  APIBufferFile,
  APIFile,
  APIWebsiteApplication,
  RESTPostAPIApplicationUploadResult,
} from "@squarecloud/api-types/v2";

export interface APIApplicationEndpoints {
  "": APIApplication | APIWebsiteApplication;
  upload: RESTPostAPIApplicationUploadResult;
  status: APIApplicationStatus;
  logs: APIApplicationLogs;
  backup: APIApplicationBackup;
  "files/list": APIFile[];
  "files/read": APIBufferFile;
}
