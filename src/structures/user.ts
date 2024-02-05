import { assertUserInfo } from "@/assertions/user";
import { UserPlan } from "@/types/user";
import { APIUserInfo } from "@squarecloud/api-types/v2";
import { BaseApplication, Collection, SquareCloudAPI } from "..";

/**
 * Represents a Square Cloud user
 *
 * @constructor
 * @param client - The client for this user
 * @param data - The data from this user
 */
export class User {
	/** The user's id */
	id: string;
	/** The user's Discord tag */
	tag: string;
	/** The user's locale */
	locale: string;
	/** The user's current plan */
	plan: UserPlan;
	/** The user's registered email */
	email: string;
	/** The user's registered applications Collection */
	applications: Collection<string, BaseApplication>;

	constructor(client: SquareCloudAPI, data: APIUserInfo) {
		assertUserInfo(data);

		const { user, applications } = data;
		const { id, tag, locale, plan, email } = user;
		const { duration } = plan;

		this.id = id;
		this.tag = tag;
		this.locale = locale;
		this.email = email;
		this.plan = {
			...plan,
			expiresInTimestamp: duration ?? undefined,
			expiresIn: duration ? new Date(duration) : undefined,
		};
		this.applications = new Collection(
			applications.map((app) => [app.id, new BaseApplication(client, app)]),
		);
	}
}
