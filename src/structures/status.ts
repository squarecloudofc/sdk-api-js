import type {
	APIApplicationStatus,
	APIApplicationStatusAll,
	ApplicationStatus as ApplicationStatusType,
} from "@squarecloud/api-types/v2";

import { assertSimpleStatus, assertStatus } from "@/assertions/status";
import { Routes } from "@/lib/routes";
import type { ApplicationStatusUsage } from "@/types/application";
import type { SquareCloudAPI } from "..";

export class SimpleApplicationStatus<R extends boolean = boolean> {
	/** The application's ID this status came from */
	applicationId: string;
	/** Usage statuses for this application */
	usage: R extends true
		? Pick<ApplicationStatusUsage, "cpu" | "ram">
		: undefined;
	/** Whether the application is running or not */
	running: R;

	constructor(
		public readonly client: SquareCloudAPI,
		data: APIApplicationStatusAll,
	) {
		assertSimpleStatus(data);

		const { id, running } = data;

		this.applicationId = id;
		this.running = running as R;

		if (running) {
			const { cpu, ram } = data;

			this.usage = { cpu, ram } as R extends true
				? Pick<ApplicationStatusUsage, "cpu" | "ram">
				: undefined;
		}
	}

	async fetch() {
		const data = await this.client.api.request(
			Routes.apps.status(this.applicationId),
		);

		return new ApplicationStatus(
			this.client,
			data.response,
			this.applicationId,
		);
	}
}

export class ApplicationStatus {
	/** The application's ID this status came from */
	applicationId: string;
	/** Usage statuses for this application */
	usage: ApplicationStatusUsage;
	/** Whether the application is running or not */
	running: boolean;
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
		assertStatus(data);

		const { cpu, ram, network, storage, running, status, requests, uptime } =
			data;

		this.applicationId = applicationId;
		this.usage = { cpu, ram, network, storage };
		this.running = running;
		this.status = status;
		this.requests = requests;
		this.uptime = uptime ? new Date(uptime) : undefined;
		this.uptimeTimestamp = uptime ?? undefined;
	}
}
