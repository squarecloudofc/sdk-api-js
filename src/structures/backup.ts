import type { APIApplicationBackup } from "@squarecloud/api-types/v2";

import { assertBackup } from "@/assertions/backup";
import type { BaseApplication } from "./application/base";

export class Backup {
	/** The ID of the application from which you fetched the backups. */
	applicationId: string;

	/** Size of the backup in bytes. */
	size: number;

	/** Date of the last modification of the backup. */
	modifiedAt: Date;

	/** Date of the last modification of the backup in millisseconds. */
	modifiedTimestamp: number;

	/** AWS access key for the backup. */
	key: string;

	/** The URL for downloading this backup */
	url: string;

	constructor(
		public readonly application: BaseApplication,
		data: APIApplicationBackup,
	) {
		assertBackup(data);
		const { name, size, modified, key } = data;
		const { userId } = application.client.api;

		this.applicationId = name;
		this.size = size;
		this.modifiedAt = new Date(modified);
		this.modifiedTimestamp = this.modifiedAt.getTime();
		this.key = key;
		this.url = `https://backups.squarecloud.app/${userId}_${name}.zip?${key}`;
	}

	/** @returns The downloaded backup buffer */
	async download(): Promise<Buffer> {
		const res = await fetch(this.url)
			.then((res) => res.arrayBuffer())
			.catch(() => undefined);

		if (!res) {
			throw new Error("BACKUP_DOWNLOAD_FAILED");
		}

		return Buffer.from(res);
	}
}
