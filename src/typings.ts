/**
 * USER
 */

type AccountPlanName =
  | 'free'
  | 'medium'
  | 'advanced'
  | 'senior'
  | 'deluxe'
  | 'orion'
  | 'ultimate';

export interface AccountPlan {
  name: AccountPlanName;
  memory: {
    limit: number;
    available: number;
    used: number;
  };
  duration: {
    formatted: string;
    timestamp: number | null;
  };
}

/**
 * APPLICATION
 */

type ApplicationLang = 'javascript' | 'typescript' | 'java' | 'python';

type ApplicationStatus =
  | 'exited'
  | 'created'
  | 'starting'
  | 'restarting'
  | 'deleting'
  | 'running';

export interface ApplicationStatusData {
  /** The application's network status */
  network: {
    total: string;
    now: string;
  };
  /** How much storage the application is currently using */
  storageUsage: string;
  /** How much cpu the application is currently using */
  cpuUsage: string;
  /** How much memory the application is currently using */
  ramUsage: string;
  /**
   * The status of the application
   *
   * - 'exited' (stopped)
   * - 'created' (being created)
   * - 'running'
   * - 'starting'
   * - 'restarting'
   * - 'deleting'
   */
  status: ApplicationStatus;
  /** Whether the application is running or not */
  running: boolean;
  /** How many requests have been made since the last start up */
  requests: 0;
  /** For how long the app is running in millisseconds */
  uptimeTimestamp: number;
  /** For how long the app is running */
  uptime: Date | null;
  /** The last time this information has been checked in millisseconds */
  lastCheckTimestamp?: number;
  /** The last time this information has been checked */
  lastCheck?: Date;
}

/** API */

export type APIResponse<T = any> = {
  status: 'success';
  code: string;
  response: T;
};

export interface RawUserData {
  user: {
    id: string;
    tag: string;
    email: string;
    plan: {
      name: AccountPlanName;
      memory: {
        limit: number;
        available: number;
        used: number;
      };
      duration: {
        formatted: string;
        raw: number | null;
      };
    };
  };
  applications: RawApplicationData[];
}

export interface RawApplicationData {
  id: string;
  tag: string;
  ram: number;
  lang: ApplicationLang;
  type: 'free' | 'paid';
  cluster: string;
  isWebsite: boolean;
  avatar: string;
}
