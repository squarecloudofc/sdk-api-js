import type {
  APIWorkspace,
  APIWorkspaceApp,
  APIWorkspaceMember,
  WorkspaceId,
} from "@squarecloud/api-types/v2";

import type { SquareCloudAPI } from "@/index";
import { Routes } from "@/lib/routes";
import {
  WorkspaceApplicationsModule,
  WorkspaceMembersModule,
} from "@/modules/workspaces";

/**
 * Represents a Square Cloud workspace
 */
export class Workspace {
  /** The workspace ID (40 hex chars or UUID v4 without hyphens) */
  public readonly id: string;
  /** The workspace display name */
  public name: string;
  /** The user ID of the workspace owner */
  public readonly owner: string;
  /** Raw list of workspace members */
  public memberList: APIWorkspaceMember[];
  /** Raw list of applications shared into this workspace */
  public applicationList: APIWorkspaceApp[];
  /** The date the workspace was created */
  public createdAt: Date;

  /** Members management module for this workspace */
  public readonly members: WorkspaceMembersModule;
  /** Applications management module for this workspace */
  public readonly applications: WorkspaceApplicationsModule;

  constructor(
    public readonly client: SquareCloudAPI,
    data: APIWorkspace,
  ) {
    this.id = data.id;
    this.name = data.name;
    this.owner = data.owner;
    this.memberList = data.members;
    this.applicationList = data.applications;
    this.createdAt = new Date(data.createdAt);

    this.members = new WorkspaceMembersModule(this);
    this.applications = new WorkspaceApplicationsModule(this);
  }

  /**
   * Fetches this workspace for the latest data
   */
  async fetch(): Promise<Workspace> {
    const { response } = await this.client.api.request(
      Routes.workspaces.info(this.id),
    );

    this.name = response.name;
    this.memberList = response.members;
    this.applicationList = response.applications;

    return this;
  }

  /**
   * Deletes the workspace.
   * - Only the workspace owner can delete it.
   *
   * @returns `true` for success
   */
  async delete(): Promise<boolean> {
    const data = await this.client.api.request(Routes.workspaces.delete(), {
      method: "DELETE",
      body: { workspaceId: this.id as WorkspaceId },
    });

    return data?.status === "success";
  }

  /**
   * Leaves the workspace.
   * - The owner cannot leave their own workspace; use {@link delete} instead.
   *
   * @returns `true` for success
   */
  async leave(): Promise<boolean> {
    const data = await this.client.api.request(Routes.workspaces.leave(), {
      method: "DELETE",
      body: { workspaceId: this.id as WorkspaceId },
    });

    return data?.status === "success";
  }
}
