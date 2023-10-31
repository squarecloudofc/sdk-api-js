import {
  APIApplication,
  APIApplicationBackup,
  APIApplicationLogs,
  APIApplicationStatus,
  APIApplicationStatusAll,
  APIListedFile,
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
}
