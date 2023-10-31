import { validatePathLike, validateString } from "@/assertions";
import { Application } from "@";
import { readFile } from "fs/promises";
import { join } from "path";

export class ApplicationFilesManager {
  constructor(public readonly application: Application) {}

  /**
   * Lists the files inside a directory
   *
   * @param path - The absolute directory path
   */
  async list(path: string = "/") {
    validateString(path, "LIST_FILES_PATH");

    const { response } = await this.application.client.api.application("files/list", this.application.id, { path });

    return response;
  }

  /**
   * Reads the specified file content
   *
   * @param path - The absolute file path
   */
  async read(path: string) {
    validateString(path, "READ_FILE_PATH");

    const { response } = await this.application.client.api.application("files/read", this.application.id, { path });

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
  async create(file: string | Buffer, fileName: string, path: string = "/") {
    validatePathLike(file, "CREATE_FILE");

    if (typeof file === "string") {
      file = await readFile(file);
    }

    const { status } = await this.application.client.api.application("files/create", this.application.id, undefined, {
      method: "POST",
      body: JSON.stringify({
        buffer: file.toJSON(),
        path: join(path, fileName),
      }),
    });

    return status === "success";
  }

  /**
   * Deletes the specified file or directory
   *
   * @param path - The absolute file or directory path
   */
  async delete(path: string) {
    validateString(path, "DELETE_FILE_PATH");

    const { status } = await this.application.client.api.application(
      "files/delete",
      this.application.id,
      { path },
      "DELETE",
    );

    return status === "success";
  }
}
