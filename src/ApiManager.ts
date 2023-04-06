import { ApiResponse, RawUserData } from './typings';

export class SquareCloudAPIError extends TypeError {
  constructor(code: string, message?: string) {
    super(code);

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

  async fetch(
    path: string,
    options: RequestInit = {},
    rootPath: 'public' | 'experimental' = 'public',
    version: string = 'v1'
  ) {
    options = {
      ...options,
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {}),
        Authorization: this.apiKey,
      },
    };

    const res = await fetch(
      `https://api.squarecloud.app/${version}/${rootPath}/${path}`,
      options
    ).catch((err) => {
      throw new SquareCloudAPIError(err.code);
    });

    const data = await res.json();

    if (data.status === 'error' || !res.ok) {
      throw new SquareCloudAPIError(data.code || 'COMMON_ERROR');
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
  ): Promise<ApiResponse> {
    if (typeof options === 'boolean') {
      options = options ? { method: 'POST' } : {};
    }

    return this.fetch(`${path}/${id}`, options);
  }
}
