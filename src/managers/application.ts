import APIManager from './api';

export default class ApplicationManager {
  constructor(private readonly apiManager: APIManager) {}

  async get(appId: string) {
    const { response: user } = await this.apiManager.user();
    const data = user?.applications.find((app) => app.id === appId);

    return data;
  }
}
