import { assertApplication } from "@/assertions/application";
import { ApplicationStatus, SquareCloudAPI } from "@/index";
import {
	ApplicationBackupManager,
	ApplicationCacheManager,
	ApplicationDeploysManager,
	ApplicationFilesManager,
} from "@/managers";
import { APIApplication, ApplicationLanguage } from "@squarecloud/api-types/v2";
import { BaseApplication } from "./base";
import { WebsiteApplication } from "./website";

/**
 * Represents a Square Cloud application
 *
 * @constructor
 * @param client - The client for this application
 * @param data - The data from this application
 */
export class Application extends BaseApplication {
	/** The application ID */
	id: string;
	/** The application display name */
	name: string;
	/** The application description */
	description?: string;
	/** The url to manage the application via web */
	url: string;
	/** The application current cluster */
	cluster: string;
	/** The application total ram */
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
	/** Files manager for this application */
	files = new ApplicationFilesManager(this);
	/** Backup manager for this application */
	backup = new ApplicationBackupManager(this);
	/** Deploys manager for this application */
	deploys = new ApplicationDeploysManager(this);
	/** Cache manager for this application */
	cache = new ApplicationCacheManager();

	constructor(
		public readonly client: SquareCloudAPI,
		data: APIApplication,
	) {
		assertApplication(data);
		super(client, { ...data, lang: data.language });

		const { id, name, desc, cluster, ram, language } = data;

		this.id = id;
		this.name = name;
		this.description = desc;
		this.cluster = cluster;
		this.ram = ram;
		this.language = language;
		this.url = `https://squarecloud.app/dashboard/app/${id}`;
	}

	/** @returns The application current status information */
	async getStatus(): Promise<ApplicationStatus> {
		const data = await this.client.api.application("status", this.id);
		const status = new ApplicationStatus(this.client, data.response, this.id);

		this.client.emit("statusUpdate", this, this.cache.status, status);
		this.cache.set("status", status);

		return status;
	}

	/** @returns The application logs */
	async getLogs(): Promise<string> {
		const data = await this.client.api.application("logs", this.id);
		const { logs } = data.response;

		this.client.emit("logsUpdate", this, this.cache.logs, logs);
		this.cache.set("logs", logs);

		return logs;
	}

	isWebsite(): this is WebsiteApplication {
		const domain = Reflect.get(this, "domain");
		return Boolean(domain);
	}
}
