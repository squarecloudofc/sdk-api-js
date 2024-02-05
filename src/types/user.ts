import { APIUserPlan } from "@squarecloud/api-types/v2";

export interface UserPlan extends Omit<APIUserPlan, "duration"> {
	/** In how many milliseconds the plan will expire */
	expiresInTimestamp?: number;
	/** In how much time the plan will expire */
	expiresIn?: Date;
}
