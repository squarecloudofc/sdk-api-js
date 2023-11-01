import { ApplicationStatusUsage } from "@/types/application";
import {
  APIApplicationStatus,
  APIApplicationStatusAll,
  ApplicationStatus as ApplicationStatusType,
} from "@squarecloud/api-types/v2";
import { SquareCloudAPI } from "..";

export class SimpleApplicationStatus {
  /** The application's ID this status came from */
  applicationId: string;
  /** Usage statuses for this application */
  usage: Pick<ApplicationStatusUsage, "cpu" | "ram">;
  /** Whether the application is running or not */
  running: boolean;

  constructor(
    public readonly client: SquareCloudAPI,
    data: APIApplicationStatusAll,
  ) {
    this.applicationId = data.id;
    this.usage = {
      cpu: data.cpu,
      ram: data.ram,
    };
    this.running = data.running;
  }

  async fetch() {
    const data = await this.client.api.application("status", this.applicationId);

    return new ApplicationStatus(this.client, data.response, this.applicationId);
  }
}

export class ApplicationStatus extends SimpleApplicationStatus {
  /** Usage statuses for this application */
  declare usage: ApplicationStatusUsage;
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
  status: ApplicationStatusType;
  /** How many requests have been made since the last start up */
  requests: number;
  /** For how long the app is running in millisseconds */
  uptimeTimestamp?: number;
  /** For how long the app is running */
  uptime?: Date;

  constructor(
    public readonly client: SquareCloudAPI,
    data: APIApplicationStatus,
    applicationId: string,
  ) {
    super(client, {
      id: applicationId,
      cpu: data.cpu,
      ram: data.ram,
      running: data.running,
    });

    this.usage = {
      cpu: data.cpu,
      ram: data.ram,
      network: data.network,
      storage: data.storage,
    };
    this.status = data.status;
    this.requests = data.requests;
    this.uptime = data.uptime ? new Date(data.uptime) : undefined;
    this.uptimeTimestamp = data.uptime ?? undefined;
  }
}
