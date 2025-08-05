import type { RESTPostAPIApplicationBackupResult } from "@squarecloud/api-types/v2";

import { Routes } from "@/lib/routes";
import { type BaseApplication, SquareCloudAPIError } from "@/structures";
import { Backup } from "@/structures/backup";

export class BackupsModule {
	constructor(public readonly application: BaseApplication) {}

	/**
	 * Gets the list of generated backups (snapshots) for this application
	 */
	async list(): Promise<Backup[]> {
		const data = await this.application.client.api.request(
			Routes.apps.snapshots(this.application.id),
		);

		const backups = data.response.map(
			(backup) => new Backup(this.application, backup),
		);

		this.application.client.emit(
			"backupsUpdate",
			this.application,
			this.application.cache.backups,
			backups,
		);
		this.application.cache.set("backups", backups);

		return backups;
	}

	/**
	 * Generates a new backup
	 * @returns The generated backup URL and key
	 */
	async create(): Promise<RESTPostAPIApplicationBackupResult> {
		const data = await this.application.client.api.request(
			Routes.apps.generateSnapshot(this.application.id),
			{ method: "POST" },
		);

		return data.response;
	}

	/**
	 * Generates a new backup and downloads it
	 * @returns The downloaded backup bufer
	 */
	async download(): Promise<Buffer> {
		const backup = await this.create();

		const res = await fetch(backup.url)
			.then((res) => res.arrayBuffer())
			.catch(() => undefined);

		if (!res) {
			throw new SquareCloudAPIError("BACKUP_DOWNLOAD_FAILED");
		}

		return Buffer.from(res);
	}
}
