import { RawUserData } from './typings';

export class SquareCloudAPIError extends Error {}

export class APIManager {
  constructor(private apiKey: string) {}

  private fetch(path: string, options: RequestInit = {}) {
    return fetch('https://api.squarecloud.app/v1/public/' + path, {
      ...options,
      headers: { Authorization: this.apiKey },
    }).then((e) => {
      if (e.status === 401) {
        throw new SquareCloudAPIError(
          'You do not have authorization to perform this action.'
        );
      }

      if (e.status === 404) {
        throw new SquareCloudAPIError(
          'The provided parameters are invalid. No data found.'
        );
      }

      return e.json();
    });
  }

  user(id?: string, options: RequestInit = {}): Promise<RawUserData> {
    return this.fetch('user' + (id ? `/${id}` : ''), options).then(
      (data) => data.response
    );
  }

  application(path: string, id: string, options: RequestInit | boolean = {}) {
    return this.fetch(
      `${path}/${id}`,
      typeof options === 'boolean'
        ? options
          ? { method: 'POST' }
          : {}
        : options
    ).then((data) => data.response);
  }
}
