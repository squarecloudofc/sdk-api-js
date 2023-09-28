/* eslint-disable no-use-before-define */

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
  response: TResponse;
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
  locale: string;
  email?: string | null;
  plan: UserPlan;
  blocklist: boolean;
}

export interface UserPlan {
  /** The user plan name */
  name: UserPlanName;
  /** How much RAM memory the plan provides */
  memory: UserPlanMemory;
  duration: UserPlanDuration;
}

export interface UserPlanMemory {
  /** The limit of RAM */
  limit: number;
  /** How much RAM is available (calc: `limit - used`) */
  available: number;
  /** How much RAM the user is currently using */
  used: number;
}

export interface UserPlanDuration {
  formatted: string;
  raw: number;
}

export interface Application {
  id: string;
  tag: string;
  desc?: string;
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

/** /apps - utils */

export interface APIApplicationEndpoints {
  upload: UploadedApplicationResponse;
  status: ApplicationStatusResponse;
  logs: ApplicationLogsResponse;
  backup: ApplicationBackupResponse;
  'files/list': ApplicationFilesListResponse;
  'files/read': ApplicationFilesReadResponse;
}

/** /apps/upload */

export interface UploadedApplicationLanguage {
  name: string;
  version: ApplicationLanguageVersion;
}

export interface UploadedApplicationResponse {
  id: string;
  tag: string;
  avatar: string;
  subdomain?: string | null;
  ram: number;
  cpu: number;
  language: UploadedApplicationLanguage;
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
  time?: number | null;
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
