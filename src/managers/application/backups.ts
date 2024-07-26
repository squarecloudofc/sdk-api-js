import { type BaseApplication, SquareCloudAPIError } from "@/index";
import { Routes } from "@/lib/routes";
import type {
	APIApplicationBackup,
	RESTPostAPIApplicationBackupResult,
} from "@squarecloud/api-types/v2";

export class ApplicationBackupsManager {
	constructor(public readonly application: BaseApplication) {}

	async list(): Promise<APIApplicationBackup[]> {
		const data = await this.application.client.api.request(
			Routes.apps.backups(this.application.id),
		);

		const backups = data.response;

		this.application.client.emit(
			"backupsUpdate",
			this.application,
			this.application.cache.backups,
			backups,
		);
		this.application.cache.set("backups", backups);

		return backups;
	}

	/** @returns The generated backup URL */
	async create(): Promise<RESTPostAPIApplicationBackupResult> {
		const data = await this.application.client.api.request(
			Routes.apps.generateBackup(this.application.id),
			{ method: "POST" },
		);

		return data.response;
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
