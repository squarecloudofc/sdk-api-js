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
	public readonly sdkVersion: string = require("../../package.json").version;
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

		if (response.status === 413) {
			throw new SquareCloudAPIError("PAYLOAD_TOO_LARGE");
		}

		if (response.status === 429) {
			throw new SquareCloudAPIError("RATE_LIMIT_EXCEEDED", "Try again later");
		}

		if (response.status === 502 || response.status === 504) {
			throw new SquareCloudAPIError("SERVER_UNAVAILABLE", "Try again later");
		}

		const data = await response.json().catch(() => {
			throw new SquareCloudAPIError(
				"CANNOT_PARSE_RESPONSE",
				`Failed with status ${response.status}`,
			);
		});

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
			"User-Agent": `squarecloud-sdk-js/${this.sdkVersion}`,
		};

		const url = new URL(path, `${this.baseUrl}/${this.version}/`);

		if ("query" in init && init.query) {
			const query = new URLSearchParams(init.query as Record<string, string>);
			url.search = query.toString();
			init.query = undefined;
		}

		if ("body" in init && init.body && !(init.body instanceof FormData)) {
			init.body = JSON.stringify(init.body);
			init.headers = {
				...init.headers,
				"Content-Type": "application/json",
			};
		}

		return { url, init };
	}
}
