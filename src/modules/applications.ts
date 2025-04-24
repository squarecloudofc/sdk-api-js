import type { RESTPostAPIApplicationUploadResult } from "@squarecloud/api-types/v2";
import { readFile } from "fs/promises";

import { assertPathLike, assertString } from "@/assertions/literal";
import { Routes } from "@/lib/routes";
import {
	Application,
	type BaseApplication,
	type Collection,
	SimpleApplicationStatus,
	SquareCloudAPIError,
	User,
} from "@/structures";
import type { SquareCloudAPI } from "..";

export class ApplicationsModule {
	constructor(public readonly client: SquareCloudAPI) {}

	/**
	 * If the ID is provided, it will return an application that you can manage or get information
	 * If the ID is not provided, it will return a collection of applications
	 *
	 * @param applicationId - The application ID, you must own the application
	 */
	async get(): Promise<Collection<string, BaseApplication>>;
	async get(applicationId: string): Promise<BaseApplication>;
	async get(
		applicationId?: string,
	): Promise<BaseApplication | Collection<string, BaseApplication>> {
		const { response } = await this.client.api.request(Routes.user());
		const user = new User(this.client, response);

		this.client.emit("userUpdate", this.client.cache.user, user);
		this.client.cache.set("user", user);

		if (applicationId) {
			assertString(applicationId, "APP_ID");
			const application = user.applications.get(applicationId);

			if (!application) {
				throw new SquareCloudAPIError("APP_NOT_FOUND");
			}

			return application;
		}

		return user.applications;
	}

	/**
	 * Uploads an application
	 *
	 * @param file - The zip file path or Buffer
	 *
	 * @returns The uploaded application data
	 */
	async create(
		file: string | Buffer,
	): Promise<RESTPostAPIApplicationUploadResult> {
		assertPathLike(file, "UPLOAD_FILE");

		if (typeof file === "string") {
			file = await readFile(file);
		}

		const formData = new FormData();
		const blob = new Blob([file]);
		formData.append("file", blob, "app.zip");

		const data = await this.client.api.request(Routes.apps.upload(), {
			method: "POST",
			body: formData,
		});

		return data.response;
	}

	/**
	 * Gets the summary status for all your applications
	 */
	async statusAll(): Promise<SimpleApplicationStatus[]> {
		const data = await this.client.api.request(Routes.apps.statusAll());

		return data.response.map(
			(status) => new SimpleApplicationStatus(this.client, status),
		);
	}

	/**
	 * Returns an application that you can manage or get information
	 *
	 * @param applicationId - The application ID, you must own the application
	 */
	async fetch(applicationId: string): Promise<Application> {
		const { response } = await this.client.api.request(
			Routes.apps.info(applicationId),
		);

		return new Application(this.client, response);
	}
}

export * from "../services/cache/application";
export * from "./backups";
export * from "./deploys";
export * from "./files";
export * from "./network";
