import type { APIApplicationBackup } from "@squarecloud/api-types/v2";

import type { BaseApplication } from "./application/base";

/**
 * Represents an application backup (snapshot)
 */
export class Backup {
	/** Size of the backup in bytes. */
	public size: number;

	/** Date of the last modification of the backup. */
	public modifiedAt: Date;

	/** Date of the last modification of the backup in millisseconds. */
	public modifiedTimestamp: number;

	/** AWS access key for the backup. */
	public readonly key: string;

	/** The URL for downloading this backup */
	public readonly url: string;

	/**
	 * Represents an application backup (snapshot)
	 *
	 * @constructor
	 * @param application - The application from which you fetched the backups
	 * @param data - The data from this backup
	 */
	constructor(
		public readonly application: BaseApplication,
		data: APIApplicationBackup,
	) {
		const { name, size, modified, key } = data;
		const { userId } = application.client.api;

		this.size = size;
		this.modifiedAt = new Date(modified);
		this.modifiedTimestamp = this.modifiedAt.getTime();
		this.key = key;
		this.url = `https://snapshots.squarecloud.app/applications/${userId}/${name}.zip?${key}`;
	}

	/**
	 * Downloads this backup
	 * @returns The downloaded backup bufer
	 */
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
