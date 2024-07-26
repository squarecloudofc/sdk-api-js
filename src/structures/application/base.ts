import { assertPathLike, assertString } from "@/assertions/literal";
import {
	ApplicationBackupsManager,
	ApplicationCacheManager,
	ApplicationDeploysManager,
	ApplicationFilesManager,
	ApplicationStatus,
	type SquareCloudAPI,
} from "@/index";
import { Routes } from "@/lib/routes";
import type {
	APIUserApplication,
	ApplicationLanguage,
} from "@squarecloud/api-types/v2";
import FormData from "form-data";
import { readFile } from "fs/promises";
import type { Application } from "./application";

/**
 * Represents the base application from the user endpoint
 *
 * @constructor
 * @param client - The client for this application
 * @param data - The data from this application
 */
export class BaseApplication {
	/** The application ID */
	id: string;
	/** The application display name */
	name: string;
	/** The application description */
	description?: string;
	/** The url to manage the application via web */
	url: string;
	/** The application total ram */
	ram: number;
	/** The application current cluster */
	cluster: string;
	/**
	 * The application programming language
	 *
	 * - `javascript`
	 * - `typescript`
	 * - `python`
	 * - `java`
	 * - `elixir`
	 * - `rust`
	 * - `go`
	 * - `php`
	 * - `dotnet`
	 * - `static`
	 */
	language: ApplicationLanguage;
	/** Cache manager for this application */
	cache = new ApplicationCacheManager();
	/** Files manager for this application */
	files = new ApplicationFilesManager(this);
	/** Backup manager for this application */
	backups = new ApplicationBackupsManager(this);
	/** Deploys manager for this application */
	deploys = new ApplicationDeploysManager(this);

	constructor(
		public readonly client: SquareCloudAPI,
		data: APIUserApplication,
	) {
		const { id, name, desc, ram, lang, cluster } = data;

		this.id = id;
		this.name = name;
		this.description = desc;
		this.ram = ram;
		this.language = lang;
		this.cluster = cluster;
		this.url = `https://squarecloud.app/dashboard/app/${id}`;
	}

	async fetch(): Promise<Application> {
		return this.client.applications.fetch(this.id);
	}

	/** @returns The application current status information */
	async getStatus(): Promise<ApplicationStatus> {
		const data = await this.client.api.request(Routes.apps.status(this.id));
		const status = new ApplicationStatus(this.client, data.response, this.id);

		return status;
	}

	/** @returns The application logs */
	async getLogs(): Promise<string> {
		const data = await this.client.api.request(Routes.apps.logs(this.id));
		const { logs } = data.response;

		return logs;
	}

	/**
	 * Starts up the application
	 * @returns `true` for success or `false` for fail
	 */
	async start(): Promise<boolean> {
		const data = await this.client.api.request(Routes.apps.start(this.id), {
			method: "POST",
		});

		return data?.status === "success";
	}

	/**
	 * Stops the application
	 * @returns `true` for success or `false` for fail
	 */
	async stop(): Promise<boolean> {
		const data = await this.client.api.request(Routes.apps.stop(this.id), {
			method: "POST",
		});

		return data?.status === "success";
	}

	/**
	 * Restarts the application
	 * @returns `true` for success or `false` for fail
	 */
	async restart(): Promise<boolean> {
		const data = await this.client.api.request(Routes.apps.restart(this.id), {
			method: "POST",
		});

		return data?.status === "success";
	}

	/**
	 * Deletes your whole application
	 *
	 * - This action is irreversible.
	 * @returns `true` for success or `false` for fail
	 */
	async delete(): Promise<boolean> {
		const data = await this.client.api.request(Routes.apps.delete(this.id), {
			method: "DELETE",
		});

		return data?.status === "success";
	}

	/**
	 * Commit files to your application folder
	 *
	 * - This action is irreversible.
	 *
	 * - Tip: use this to get an absolute path.
	 * ```ts
	 * require('path').join(__dirname, 'fileName')
	 * ```
	 * - Tip2: use a zip file to commit more than one archive
	 *
	 * @param file - Buffer or absolute path to the file
	 * @param fileName - The file name (e.g.: "index.js")
	 * @param restart - Whether the application should be restarted after the commit
	 * @returns `true` for success or `false` for fail
	 */
	async commit(
		file: string | Buffer,
		fileName?: string,
		restart?: boolean,
	): Promise<boolean> {
		assertPathLike(file, "COMMIT_DATA");

		if (fileName) {
			assertString(fileName, "FILE_NAME");
		}

		if (typeof file === "string") {
			file = await readFile(file);
		}

		const formData = new FormData();
		formData.append("file", file, { filename: fileName || "app.zip" });

		const data = await this.client.api.request(Routes.apps.commit(this.id), {
			method: "POST",
			query: { restart: Boolean(restart) },
			body: formData.getBuffer(),
			headers: formData.getHeaders(),
		});

		return data?.status === "success";
	}
}
