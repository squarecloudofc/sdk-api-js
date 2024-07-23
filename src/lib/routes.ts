import type { APIEndpoint } from "@/types";

export type Route<T extends APIEndpoint> = string & { __route: T };
export const Route = <T extends APIEndpoint>(route: string) => {
	return route as Route<T>;
};

export const Routes = {
	user() {
		return Route<"user">("/v2/users/me");
	},
	service: {
		status() {
			return Route<"service/status">("/v2/service/status");
		},
	},
	apps: {
		upload() {
			return Route<"apps/upload">("/v2/apps");
		},
		statusAll() {
			return Route<"apps/status-all">("/v2/apps/status");
		},
		info(appId: string) {
			return Route<"apps/info">(`/v2/apps/${appId}`);
		},
		status(appId: string) {
			return Route<"apps/status">(`/v2/apps/${appId}/status`);
		},
		logs(appId: string) {
			return Route<"apps/logs">(`/v2/apps/${appId}/logs`);
		},
		backups(appId: string) {
			return Route<"apps/backups">(`/v2/apps/${appId}/backups`);
		},
		generateBackup(appId: string) {
			return Route<"apps/generate-backup">(`/v2/apps/${appId}/backups`);
		},
		start(appId: string) {
			return Route<"apps/start">(`/v2/apps/${appId}/start`);
		},
		restart(appId: string) {
			return Route<"apps/restart">(`/v2/apps/${appId}/restart`);
		},
		stop(appId: string) {
			return Route<"apps/stop">(`/v2/apps/${appId}/stop`);
		},
		delete(appId: string) {
			return Route<"apps/delete">(`/v2/apps/${appId}`);
		},
		commit(appId: string) {
			return Route<"apps/commit">(`/v2/apps/${appId}/commit`);
		},
		files: {
			read(appId: string) {
				return Route<"apps/files/read">(`/v2/apps/${appId}/files/content`);
			},
			list(appId: string) {
				return Route<"apps/files/list">(`/v2/apps/${appId}/files`);
			},
			upsert(appId: string) {
				return Route<"apps/files/upsert">(`/v2/apps/${appId}/files`);
			},
			move(appId: string) {
				return Route<"apps/files/move">(`/v2/apps/${appId}/files`);
			},
			delete(appId: string) {
				return Route<"apps/files/delete">(`/v2/apps/${appId}/files`);
			},
		},
		deployments: {
			list(appId: string) {
				return Route<"apps/deployments/list">(`/v2/apps/${appId}/deployments`);
			},
			current(appId: string) {
				return Route<"apps/deployments/current">(
					`/v2/apps/${appId}/deployments/current`,
				);
			},
			webhook(appId: string) {
				return Route<"apps/deployments/webhook">(
					`/v2/apps/${appId}/deploy/webhook`,
				);
			},
		},
		network: {
			dns(appId: string) {
				return Route<"apps/network/dns">(`/v2/apps/${appId}/network/dns`);
			},
			analytics(appId: string) {
				return Route<"apps/network/analytics">(
					`/v2/apps/${appId}/network/analytics`,
				);
			},
			custom(appId: string) {
				return Route<"apps/network/custom">(`/v2/apps/${appId}/network/custom`);
			},
		},
	},
};
