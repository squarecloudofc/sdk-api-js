import type { APIVersion } from "@squarecloud/api-types/v2";

import { SquareCloudAPIError } from "@/structures";
import type {
	APIEndpoint,
	APIRequestArgs,
	APIRequestOptions,
	APIResponse,
} from "@/types";

export class APIService {
	public readonly baseUrl = "https://api.squarecloud.app";
	public readonly version: APIVersion<1 | 2> = "v2";
	public readonly userId: string;

	constructor(protected readonly apiKey: string) {
		this.userId = apiKey.split("-")[0];
	}

	async request<T extends APIEndpoint>(
		...[path, options]: APIRequestArgs<T>
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
		const init: RequestInit = options || {};

		init.method = init.method || "GET";
		init.headers = {
			Accept: "application/json",
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
			init.headers = {
				...init.headers,
				"Content-Type": "application/json",
			};
		}

		return { url, init };
	}
}
