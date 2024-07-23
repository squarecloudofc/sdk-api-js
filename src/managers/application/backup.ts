import { type Application, SquareCloudAPIError } from "@/index";
import { Routes } from "@/lib/routes";
import type { RESTPostAPIApplicationBackupResult } from "@squarecloud/api-types/v2";

export class ApplicationBackupManager {
	constructor(public readonly application: Application) {}

	/** @returns The generated backup URL */
	async create(): Promise<RESTPostAPIApplicationBackupResult> {
		const data = await this.application.client.api.request(
			Routes.apps.generateBackup(this.application.id),
			{ method: "POST" },
		);

		const backup = data.response;

		this.application.client.emit(
			"backupUpdate",
			this.application,
			this.application.cache.backup,
			backup,
		);
		this.application.cache.set("backup", backup);

		return backup;
	}

	/** @returns The generated backup buffer */
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
