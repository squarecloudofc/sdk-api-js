import type { APIEndpoint } from "@/types";

export type Route<T extends APIEndpoint> = string & { __route: T };
export const Route = <T extends APIEndpoint>(route: string) =>
  route as Route<T>;

interface IRoutes {
  [k: string]: ((...args: string[]) => Route<APIEndpoint>) | IRoutes;
}

export const Routes = {
  user: () => {
    return Route<"user">("users/me");
  },
  userSnapshots: () => {
    return Route<"user/snapshots">("users/snapshots");
  },
  service: {
    status: () => {
      return Route<"service/status">("service/status");
    },
  },
  apps: {
    upload: () => {
      return Route<"apps/upload">("apps");
    },
    statusAll: () => {
      return Route<"apps/status-all">("apps/status");
    },
    info: (appId: string) => {
      return Route<"apps/info">(`apps/${appId}`);
    },
    status: (appId: string) => {
      return Route<"apps/status">(`apps/${appId}/status`);
    },
    logs: (appId: string) => {
      return Route<"apps/logs">(`apps/${appId}/logs`);
    },
    metrics: (appId: string) => {
      return Route<"apps/metrics">(`apps/${appId}/metrics`);
    },
    realtime: (appId: string) => {
      return Route<"apps/realtime">(`apps/${appId}/realtime`);
    },
    delete: (appId: string) => {
      return Route<"apps/delete">(`apps/${appId}`);
    },
    commit: (appId: string) => {
      return Route<"apps/commit">(`apps/${appId}/commit`);
    },
    snapshots: (appId: string) => {
      return Route<"apps/snapshots">(`apps/${appId}/snapshots`);
    },
    generateSnapshot: (appId: string) => {
      return Route<"apps/generate-snapshot">(`apps/${appId}/snapshots`);
    },
    restoreSnapshot: (appId: string) => {
      return Route<"apps/restore-snapshot">(`apps/${appId}/snapshots/restore`);
    },
    start: (appId: string) => {
      return Route<"apps/start">(`apps/${appId}/start`);
    },
    restart: (appId: string) => {
      return Route<"apps/restart">(`apps/${appId}/restart`);
    },
    stop: (appId: string) => {
      return Route<"apps/stop">(`apps/${appId}/stop`);
    },
    envs: {
      list: (appId: string) => {
        return Route<"apps/envs/list">(`apps/${appId}/envs`);
      },
      set: (appId: string) => {
        return Route<"apps/envs/set">(`apps/${appId}/envs`);
      },
      replace: (appId: string) => {
        return Route<"apps/envs/replace">(`apps/${appId}/envs`);
      },
      delete: (appId: string) => {
        return Route<"apps/envs/delete">(`apps/${appId}/envs`);
      },
    },
    files: {
      read: (appId: string) => {
        return Route<"apps/files/read">(`apps/${appId}/files/content`);
      },
      list: (appId: string) => {
        return Route<"apps/files/list">(`apps/${appId}/files`);
      },
      upsert: (appId: string) => {
        return Route<"apps/files/upsert">(`apps/${appId}/files`);
      },
      move: (appId: string) => {
        return Route<"apps/files/move">(`apps/${appId}/files`);
      },
      delete: (appId: string) => {
        return Route<"apps/files/delete">(`apps/${appId}/files`);
      },
    },
    deployments: {
      list: (appId: string) => {
        return Route<"apps/deployments/list">(`apps/${appId}/deployments`);
      },
      current: (appId: string) => {
        return Route<"apps/deployments/current">(
          `apps/${appId}/deployments/current`,
        );
      },
      webhook: (appId: string) => {
        return Route<"apps/deployments/webhook">(
          `apps/${appId}/deploy/webhook`,
        );
      },
      githubApp: {
        link: (appId: string) => {
          return Route<"apps/deployments/github-app/link">(
            `apps/${appId}/deploy/github-app`,
          );
        },
        unlink: (appId: string) => {
          return Route<"apps/deployments/github-app/unlink">(
            `apps/${appId}/deploy/github-app`,
          );
        },
      },
    },
    network: {
      dns: (appId: string) => {
        return Route<"apps/network/dns">(`apps/${appId}/network/dns`);
      },
      custom: (appId: string) => {
        return Route<"apps/network/custom">(`apps/${appId}/network/custom`);
      },
      analytics: (appId: string) => {
        return Route<"apps/network/analytics">(
          `apps/${appId}/network/analytics`,
        );
      },
      errors: (appId: string) => {
        return Route<"apps/network/errors">(`apps/${appId}/network/errors`);
      },
      logs: (appId: string) => {
        return Route<"apps/network/logs">(`apps/${appId}/network/logs`);
      },
      performance: (appId: string) => {
        return Route<"apps/network/performance">(
          `apps/${appId}/network/performance`,
        );
      },
      purgeCache: (appId: string) => {
        return Route<"apps/network/purge-cache">(
          `apps/${appId}/network/purge_cache`,
        );
      },
    },
  },
  databases: {
    create: () => {
      return Route<"databases/create">("databases");
    },
    statusAll: () => {
      return Route<"databases/status-all">("databases/status");
    },
    info: (databaseId: string) => {
      return Route<"databases/info">(`databases/${databaseId}`);
    },
    delete: (databaseId: string) => {
      return Route<"databases/delete">(`databases/${databaseId}`);
    },
    update: (databaseId: string) => {
      return Route<"databases/update">(`databases/${databaseId}`);
    },
    status: (databaseId: string) => {
      return Route<"databases/status">(`databases/${databaseId}/status`);
    },
    metrics: (databaseId: string) => {
      return Route<"databases/metrics">(`databases/${databaseId}/metrics`);
    },
    start: (databaseId: string) => {
      return Route<"databases/start">(`databases/${databaseId}/start`);
    },
    stop: (databaseId: string) => {
      return Route<"databases/stop">(`databases/${databaseId}/stop`);
    },
    credentials: {
      certificate: (databaseId: string) => {
        return Route<"databases/credentials/certificate">(
          `databases/${databaseId}/credentials/certificate`,
        );
      },
      reset: (databaseId: string) => {
        return Route<"databases/credentials/reset">(
          `databases/${databaseId}/credentials/reset`,
        );
      },
    },
    snapshots: {
      list: (databaseId: string) => {
        return Route<"databases/snapshots/list">(
          `databases/${databaseId}/snapshots`,
        );
      },
      create: (databaseId: string) => {
        return Route<"databases/snapshots/create">(
          `databases/${databaseId}/snapshots`,
        );
      },
      restore: (databaseId: string) => {
        return Route<"databases/snapshots/restore">(
          `databases/${databaseId}/snapshots/restore`,
        );
      },
    },
  },
  workspaces: {
    list: () => {
      return Route<"workspaces/list">("workspaces");
    },
    create: () => {
      return Route<"workspaces/create">("workspaces");
    },
    delete: () => {
      return Route<"workspaces/delete">("workspaces");
    },
    info: (workspaceId: string) => {
      return Route<"workspaces/info">(`workspaces/${workspaceId}`);
    },
    leave: () => {
      return Route<"workspaces/leave">("workspaces/leave");
    },
    applications: {
      add: () => {
        return Route<"workspaces/applications/add">("workspaces/applications");
      },
      remove: () => {
        return Route<"workspaces/applications/remove">(
          "workspaces/applications",
        );
      },
    },
    members: {
      add: () => {
        return Route<"workspaces/members/add">("workspaces/members");
      },
      update: () => {
        return Route<"workspaces/members/update">("workspaces/members");
      },
      remove: () => {
        return Route<"workspaces/members/remove">("workspaces/members");
      },
      inviteCode: () => {
        return Route<"workspaces/members/invite-code">(
          "workspaces/members/code",
        );
      },
    },
  },
} satisfies IRoutes;
