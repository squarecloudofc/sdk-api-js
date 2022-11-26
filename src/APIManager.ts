import { APIResponse, RawUserData } from './typings';

export class SquareCloudAPIError extends Error {
  constructor(code: string, message?: string) {
    super();

    this.name = 'SquareCloudAPIError';

    this.message =
      code
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/(^|\s)\S/g, (L) => L.toUpperCase()) +
      (message ? `: ${message}` : '');
  }
}

export class APIManager {
  constructor(private apiKey: string) {
    this.testApiKey();
  }

  private async testApiKey() {
    try {
      await this.fetch('user');
    } catch {
      throw new SquareCloudAPIError('INVALID_API_KEY');
    }
  }

  private async fetch(path: string, options: RequestInit = {}) {
    options.headers = {
      ...(options.headers || {}),
      Authorization: this.apiKey,
    };

    options.method = options.method || 'GET';

    const data = await fetch(
      'https://api.squarecloud.app/v1/public/' + path,
      options
    )
      .then((r) => r.json());

    if (data.status === 'error') {
      throw new SquareCloudAPIError(data.code);
    }

    return data;
  }

  user(id?: string, options: RequestInit = {}): Promise<RawUserData> {
    return this.fetch('user' + (id ? `/${id}` : ''), options).then(
      (e) => e.response
    );
  }

  application(
    path: string,
    id: string,
    options: RequestInit | boolean = {}
  ): Promise<APIResponse> {
    return this.fetch(
      `${path}/${id}`,
      typeof options === 'boolean'
        ? options
          ? { method: 'POST' }
          : {}
        : options
    );
  }
}
