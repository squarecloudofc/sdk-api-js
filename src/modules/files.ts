import { readFile } from "fs/promises";
import { join } from "path";

import type { BaseApplication } from "@/structures";
import { assertPathLike, assertString } from "@/assertions/literal";
import { Routes } from "@/lib/routes";

export class FilesModule {
  constructor(public readonly application: BaseApplication) {}

  /**
   * Lists the files inside a directory
   *
   * @param path - The absolute directory path
   */
  async list(path = "/") {
    assertString(path, "LIST_FILES_PATH");

    const { response } = await this.application.client.api.request(
      Routes.apps.files.list(this.application.id),
      { query: { path } },
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

    const { response } = await this.application.client.api.request(
      Routes.apps.files.read(this.application.id),
      { query: { path } },
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
    assertString(fileName, "CREATE_FILE_NAME");
    assertString(path, "CREATE_FILE_PATH");

    if (typeof file === "string") {
      file = await readFile(file);
    }
    path = join(path, fileName).replaceAll("\\", "/");

    const { status } = await this.application.client.api.request(
      Routes.apps.files.upsert(this.application.id),
      {
        method: "PUT",
        body: { content: file.toString("utf8"), path },
      },
    );

    return status === "success";
  }

  /**
   * Edits an existing file (same as create)
   *
   * @param file - The file content
   * @param path - The absolute file path
   */
  async edit(file: string | Buffer, path = "/") {
    assertPathLike(file, "EDIT_FILE");
    assertString(path, "EDIT_FILE_PATH");

    return this.create(file, "", path);
  }

  /**
   * Moves or renames a file
   *
   * @param path - The current absolute file path
   * @param newPath - The new absolute file path
   */
  async move(path: string, newPath: string) {
    assertString(path, "MOVE_FILE_PATH");
    assertString(newPath, "MOVE_FILE_NEW_PATH");

    const { status } = await this.application.client.api.request(
      Routes.apps.files.move(this.application.id),
      { method: "PATCH", body: { path, to: newPath } },
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

    const { status } = await this.application.client.api.request(
      Routes.apps.files.delete(this.application.id),
      { method: "DELETE", body: { path } },
    );

    return status === "success";
  }
}
