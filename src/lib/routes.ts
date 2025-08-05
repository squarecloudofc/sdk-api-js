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
		start: (appId: string) => {
			return Route<"apps/start">(`apps/${appId}/start`);
		},
		restart: (appId: string) => {
			return Route<"apps/restart">(`apps/${appId}/restart`);
		},
		stop: (appId: string) => {
			return Route<"apps/stop">(`apps/${appId}/stop`);
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
		},
	},
} satisfies IRoutes;
