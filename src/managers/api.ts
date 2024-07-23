import type { Route } from "@/lib/routes";
import type { APIPayload, APIVersion } from "@squarecloud/api-types/v2";
import {
	type APIEndpoint,
	type APIRequestOptions,
	type APIResponse,
	SquareCloudAPIError,
} from "..";

export class APIManager {
	public readonly baseUrl = "https://api.squarecloud.app";
	public readonly version: APIVersion<1 | 2> = "v2";

	constructor(readonly apiKey: string) {}

	async request<T extends APIEndpoint>(
		path: Route<T>,
		options?: APIRequestOptions<T>,
	): Promise<APIResponse<T>> {
		const { url, init } = this.parseRequestOptions(path, options);

		const response = await fetch(url, init).catch((err) => {
			throw new SquareCloudAPIError(err.code, err.message);
		});
		const data = await response.json();

		if (!data || data.status === "error" || !response.ok) {
			throw new SquareCloudAPIError(data?.code || "COMMON_ERROR");
		}

		return data;
	}

	private parseRequestOptions(
		path: string,
		options?: APIRequestOptions<APIEndpoint>,
	) {
		const init = options || ({} as RequestInit);

		init.method = init.method || "GET";
		init.headers = {
			...(init.headers || {}),
			Authorization: this.apiKey,
		};

		const url = new URL(path, `${this.baseUrl}/${this.version}`);

		if ("query" in init && init.query) {
			const query = new URLSearchParams(init.query as Record<string, string>);
			url.search = query.toString();
			init.query = undefined;
		}

		if ("body" in init && init.body && !(init.body instanceof Buffer)) {
			init.body = JSON.stringify(init.body);
		}

		return { url, init };
	}
}
