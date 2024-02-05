import { APIApplicationStatusNetwork } from "@squarecloud/api-types/v2";

export interface ApplicationStatusUsage {
	/** How much memory the application is currently using */
	ram: string;
	/** How much cpu the application is currently using */
	cpu: string;
	/** How much storage the application is currently using */
	storage: string;
	/** The application's network status */
	network: APIApplicationStatusNetwork;
}
