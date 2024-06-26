import { join } from "path";
import { assertPathLike, assertString } from "@/assertions/literal";
import type { Application } from "@/index";
import { readFile } from "fs/promises";

export class ApplicationFilesManager {
	constructor(public readonly application: Application) {}

	/**
	 * Lists the files inside a directory
	 *
	 * @param path - The absolute directory path
	 */
	async list(path = "/") {
		assertString(path, "LIST_FILES_PATH");

		const { response } = await this.application.client.api.application(
			"files/list",
			this.application.id,
			{ path },
		);

		return response;
	}

	/**
	 * Reads the specified file content
	 *
	 * @param path - The absolute file path
	 */
	async read(path: string) {
		assertString(path, "READ_FILE_PATH");

		const { response } = await this.application.client.api.application(
			"files/read",
			this.application.id,
			{ path },
		);

		if (!response) {
			return;
		}

		return Buffer.from(response.data);
	}

	/**
	 * Creates a new file
	 *
	 * @param file - The file content
	 * @param fileName - The file name with extension
	 * @param path - The absolute file path
	 */
	async create(file: string | Buffer, fileName: string, path = "/") {
		assertPathLike(file, "CREATE_FILE");

		if (typeof file === "string") {
			file = await readFile(file);
		}
		path = join(path, fileName).replaceAll("\\", "/");

		const { status } = await this.application.client.api.application(
			"files/create",
			this.application.id,
			undefined,
			{
				method: "POST",
				body: JSON.stringify({
					buffer: file.toJSON(),
					path,
				}),
			},
		);

		return status === "success";
	}

	/**
	 * Deletes the specified file or directory
	 *
	 * @param path - The absolute file or directory path
	 */
	async delete(path: string) {
		assertString(path, "DELETE_FILE_PATH");

		const { status } = await this.application.client.api.application(
			"files/delete",
			this.application.id,
			{ path },
			"DELETE",
		);

		return status === "success";
	}
}
