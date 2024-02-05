import { SquareCloudAPI, User } from "..";

export class UserManager {
	constructor(public readonly client: SquareCloudAPI) {}

	/**
	 * Gets a user's informations
	 *
	 * @param userId - The user ID, if not provided it will get your own information
	 */
	async get(): Promise<User> {
		const { response } = await this.client.api.user();
		const user = new User(this.client, response);

		this.client.emit("userUpdate", this.client.cache.user, user);
		this.client.cache.set("user", user);

		return user;
	}
}
