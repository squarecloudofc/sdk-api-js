import { validateString } from '../assertions';
import User, { FullUser } from '../structures/user';
import APIManager from './api';

export default class UserManager {
  constructor(private readonly apiManager: APIManager) {}

  /**
   * Gets a user's informations
   *
   * @param userId - The user ID, if not provided it will get your own information
   */
  async get(): Promise<FullUser | undefined>;
  async get(userId: string): Promise<User | undefined>;
  async get(userId?: string): Promise<User | undefined> {
    if (userId) {
      validateString(userId, 'USER_ID');
    }

    const { response } = await this.apiManager.user(userId);
    if (!response) {
      return;
    }

    const { email } = response.user;
    const hasAccess = email && email !== 'Access denied';

    if (hasAccess) {
      return new FullUser(this.apiManager, response);
    }
    return new User(this.apiManager, response);
  }
}
