import { SquareCloudAPI } from '..';
import { validateString } from '../assertions';
import User, { FullUser } from '../structures/user';

export default class UserManager {
  constructor(public readonly client: SquareCloudAPI) {}

  /**
   * Gets a user's informations
   *
   * @param userId - The user ID, if not provided it will get your own information
   */
  async get(): Promise<FullUser>;
  async get(userId: string): Promise<User>;
  async get(userId?: string): Promise<User> {
    if (userId) {
      validateString(userId, 'USER_ID');
    }

    const { response } = await this.client.api.user(userId);

    const { email } = response.user;
    const hasAccess = email && email !== 'Access denied';

    if (hasAccess) {
      return new FullUser(this.client, response);
    }
    return new User(response);
  }
}
