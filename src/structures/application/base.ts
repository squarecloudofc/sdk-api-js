import { assertPathLike, assertString } from "@/assertions/literal";
import { ApplicationStatus, type SquareCloudAPI } from "@/index";
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
	id: string;
	name: string;
	description?: string;
	url: string;
	ram: number;
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
	 */
	language: ApplicationLanguage;
	cluster: string;

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
		const data = await this.client.api.application("status", this.id);
		const status = new ApplicationStatus(this.client, data.response, this.id);

		return status;
	}

	/** @returns The application logs */
	async getLogs(): Promise<string> {
		const data = await this.client.api.application("logs", this.id);
		const { logs } = data.response;

		return logs;
	}

	/**
	 * Starts up the application
	 * @returns `true` for success or `false` for fail
	 */
	async start(): Promise<boolean> {
		const data = await this.client.api.application(
			"start",
			this.id,
			undefined,
			"POST",
		);

		return data?.status === "success";
	}

	/**
	 * Stops the application
	 * @returns `true` for success or `false` for fail
	 */
	async stop(): Promise<boolean> {
		const data = await this.client.api.application(
			"stop",
			this.id,
			undefined,
			"POST",
		);

		return data?.status === "success";
	}

	/**
	 * Restarts the application
	 * @returns `true` for success or `false` for fail
	 */
	async restart(): Promise<boolean> {
		const data = await this.client.api.application(
			"restart",
			this.id,
			undefined,
			"POST",
		);

		return data?.status === "success";
	}

	/**
	 * Deletes your whole application
	 *
	 * - This action is irreversible.
	 * @returns `true` for success or `false` for fail
	 */
	async delete(): Promise<boolean> {
		const data = await this.client.api.application(
			"delete",
			this.id,
			undefined,
			"DELETE",
		);

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

		const data = await this.client.api.application(
			"commit",
			this.id,
			{
				restart: `${Boolean(restart)}`,
			},
			{
				method: "POST",
				body: formData.getBuffer(),
				headers: formData.getHeaders(),
			},
		);

		return data?.status === "success";
	}
}
