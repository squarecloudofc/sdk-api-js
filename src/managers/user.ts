import { validateString } from '../assertions';
import User, { FullUser } from '../structures/user';
import APIManager from './api';

export default class UserManager {
  readonly #apiManager: APIManager;

  constructor(apiManager: APIManager) {
    this.#apiManager = apiManager;
  }

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

    const { response } = await this.#apiManager.user(userId);

    const { email } = response.user;
    const hasAccess = email && email !== 'Access denied';

    if (hasAccess) {
      return new FullUser(this.#apiManager, response);
    }
    return new User(response);
  }
}
