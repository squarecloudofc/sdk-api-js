import type { APIEnvVars } from "@squarecloud/api-types/v2";

import type { BaseApplication } from "@/structures";
import { Routes } from "@/lib/routes";

export class EnvsModule {
  constructor(public readonly application: BaseApplication) {}

  /**
   * Gets the application's environment variables
   *
   * @returns A `{ key: value }` map of env variables
   */
  async list(): Promise<APIEnvVars> {
    const { response } = await this.application.client.api.request(
      Routes.apps.envs.list(this.application.id),
    );

    return response;
  }

  /**
   * Merges new environment variables into the existing set.
   * Existing variables not present in `envs` are preserved.
   *
   * @param envs - Variables to add or update
   * @returns The full updated env set
   */
  async set(envs: Record<string, string>): Promise<APIEnvVars> {
    const { response } = await this.application.client.api.request(
      Routes.apps.envs.set(this.application.id),
      { method: "POST", body: { envs } },
    );

    return response;
  }

  /**
   * Replaces the entire env set with `envs`. Variables not listed are removed.
   * Pass an empty object to wipe all variables.
   *
   * @param envs - The complete env set to apply
   * @returns The full updated env set
   */
  async replace(envs: Record<string, string>): Promise<APIEnvVars> {
    const { response } = await this.application.client.api.request(
      Routes.apps.envs.replace(this.application.id),
      { method: "PUT", body: { envs } },
    );

    return response;
  }

  /**
   * Removes the given keys from the application's env variables.
   * Unknown keys are silently ignored.
   *
   * @param keys - Variable names to remove
   * @returns The remaining env set after removal
   */
  async delete(keys: string[]): Promise<APIEnvVars> {
    const { response } = await this.application.client.api.request(
      Routes.apps.envs.delete(this.application.id),
      { method: "DELETE", body: { envs: keys } },
    );

    return response;
  }
}
