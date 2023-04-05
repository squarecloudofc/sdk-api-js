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

export class ApiManager {
  constructor(private apiKey: string) {}

  async fetch(path: string, options: RequestInit = {}) {
    options.headers = {
      ...(options.headers || {}),
      Authorization: this.apiKey,
    };

    options.method = options.method || 'GET';

    const res = await fetch(
      `https://api.squarecloud.app/v1/public/${path}`,
      options
    ).catch((err) => {
      throw new SquareCloudAPIError(err.code);
    });

    const data = await res.json();

    if (data.status === 'error' || !res.ok) {
      throw new SquareCloudAPIError(data.code || 'SQUARE_CLOUD_API_ERROR');
    }

    return data;
  }

  user(id?: string): Promise<RawUserData> {
    return this.fetch('user' + (id ? `/${id}` : '')).then((e) => e?.response);
  }

  application(
    path: string,
    id: string,
    options: RequestInit | boolean = {}
  ): Promise<APIResponse> {
    if (typeof options === 'boolean') {
      options = options ? { method: 'POST' } : {};
    }

    return this.fetch(`${path}/${id}`, options);
  }
}
