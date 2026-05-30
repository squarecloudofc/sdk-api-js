import type {
  APIDeployment,
  APIDeploymentCommitFiles,
  DeploymentState,
} from "@squarecloud/api-types/v2";

import type { BaseApplication } from "./application/base";

/**
 * Represents a single event in a deploy's timeline. A complete deploy walks
 * through several states sharing the same `id`:
 * `pending → clone → commit → restarting → success | error`.
 *
 * `branch` is present only for `state: "clone"`, and `files` only for
 * `state: "commit"`.
 */
export class Deployment {
  /** Commit SHA-1 (40 hex chars). Shared by every event of a single deploy. */
  public readonly id: string;

  /** The current state of this event. */
  public state: DeploymentState;

  /** The date the deploy was created. */
  public createdAt: Date;

  /** The date the deploy was created in millisseconds. */
  public createdTimestamp: number;

  /** Branch name. Present only when `state === "clone"`. */
  public branch?: string;

  /** Changed files. Present only when `state === "commit"`. */
  public files?: APIDeploymentCommitFiles;

  /**
   * Represents an application deployment event
   *
   * @constructor
   * @param application - The application from which you fetched the deployment
   * @param data - The data from this deployment
   */
  constructor(
    public readonly application: BaseApplication,
    data: APIDeployment,
  ) {
    this.id = data.id;
    this.state = data.state;
    this.createdAt = new Date(data.date);
    this.createdTimestamp = this.createdAt.getTime();

    if (data.state === "clone") {
      this.branch = data.branch;
    }

    if (data.state === "commit") {
      this.files = data.files;
    }
  }
}
