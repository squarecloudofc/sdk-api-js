import {
  ApplicationFileType,
  ApplicationLanguage,
  ApplicationLanguageVersion,
  ApplicationStatus,
  ApplicationTier,
  UserPlanName,
} from './enums';

export type APIResponseStatus = 'error' | 'success';

export interface APIResponse<TResponse = any> {
  response?: TResponse;
  status: APIResponseStatus;
  code?: string | null;
  message?: string;
}

/** /service/statistics */

export interface ServiceStatistics {
  users: number;
  apps: number;
  websites: number;
  ping: number;
  time?: number | null;
}

export interface ServiceStatisticsResponse {
  statistics: ServiceStatistics;
}

/** /user/:userId? */

export interface User {
  id: string;
  tag: string;
  locale?: string;
  email?: string | null;
  plan: UserPlan;
  blocklist: boolean;
}

export interface UserPlan {
  name: UserPlanName;
  memory: UserPlanMemory;
  duration: UserPlanDuration;
}

export interface UserPlanMemory {
  limit: number;
  available: number;
  used: number;
}

export interface UserPlanDuration {
  formatted: string;
  raw: number;
}

export interface Application {
  id: string;
  tag: string;
  ram: number;
  lang: ApplicationLanguage;
  type: ApplicationTier;
  cluster: string;
  isWebsite: boolean;
  avatar: string;
}

export interface UserResponse {
  user: User;
  applications: Application[];
}

/** /apps/upload */

export interface UploadedApplication {
  id: string;
  tag: string;
  avatar: string;
  subdomain?: string | null;
  ram: number;
  cpu: number;
  language: UploadedApplicationLanguage;
}

export interface UploadedApplicationLanguage {
  name: string;
  version: ApplicationLanguageVersion;
}

export interface UploadedApplicationResponse {
  app: UploadedApplication;
}

/** /apps/:appId/status */

export interface ApplicationStatusNetwork {
  total: string;
  now: string;
}

export interface ApplicationStatusResponse {
  cpu: string;
  ram: string;
  status: ApplicationStatus;
  running: boolean;
  storage: string;
  network: ApplicationStatusNetwork;
  requests: number;
  uptime?: number | null;
}

/** /apps/:appId/logs */
/** /apps/:appId/full-logs */

export interface ApplicationLogsResponse {
  logs: string;
}

/** /apps/:appId/backup */

export interface ApplicationBackupResponse {
  downloadURL: string;
}

/** /apps/:appId/files/list?path */

export interface ApplicationFileListed {
  type: ApplicationFileType;
  name: string;
  size: number;
  lastModified: number;
}

export type ApplicationFilesListResponse = ApplicationFileListed[];

/** /apps/:appId/files/read?path */

export interface ApplicationFilesReadResponse {
  data: number[];
  type: string;
}

/** /apps/:appId/files/create */

export interface ApplicationFileCreateBody {
  buffer: number[];
  path: string;
}
