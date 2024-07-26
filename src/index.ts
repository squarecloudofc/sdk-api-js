import { assertString } from "./assertions/literal";
import { ApplicationsModule, UserModule } from "./modules";
import { APIService, GlobalCacheService } from "./services";
import { type ClientEvents, TypedEventEmitter } from "./types";

export class SquareCloudAPI extends TypedEventEmitter<ClientEvents> {
	static apiInfo = {
		latestVersion: "v2",
		baseUrl: "https://api.squarecloud.app/",
	};

	/** The API service */
	public readonly api: APIService;

	/** The applications module */
	public applications = new ApplicationsModule(this);
	/** The users module */
	public users = new UserModule(this);
	/** The global cache service */
	public cache = new GlobalCacheService();

	/**
	 * Creates an API instance
	 *
	 * @param apiKey - Your API Token (request at [Square Cloud Dashboard](https://squarecloud.app/dashboard))
	 */
	constructor(apiKey: string) {
		super();

		assertString(apiKey, "API_KEY");
		this.api = new APIService(apiKey);
	}
}

export * from "./structures";
export * from "./types";
