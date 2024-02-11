import { assertString } from "./assertions/literal";
import {
	APIManager,
	ApplicationManager,
	CacheManager,
	UserManager,
} from "./managers";
import { ClientEvents, TypedEventEmitter } from "./types";

export class SquareCloudAPI extends TypedEventEmitter<ClientEvents> {
	static apiInfo = {
		latestVersion: "v2",
		baseUrl: "https://api.squarecloud.app/",
	};

	public readonly api: APIManager;

	/** The applications manager */
	public applications = new ApplicationManager(this);
	/** The users manager */
	public users = new UserManager(this);
	/** The global cache manager */
	public cache = new CacheManager();

	/**
	 * Creates an API instance
	 *
	 * @param apiKey - Your API Token (generate at [Square Cloud Dashboard](https://squarecloud.app/dashboard))
	 * @param options.experimental - Whether to enable experimental features
	 */
	constructor(apiKey: string) {
		super();

		assertString(apiKey, "API_KEY");
		this.api = new APIManager(apiKey);
	}
}

export * from "./managers";
export * from "./structures";
export * from "./types";
