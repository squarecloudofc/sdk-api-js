import { APIResponse, RawUserData } from './typings';
import { AxiosRequestConfig } from 'axios';
import { api } from './services/api';

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
  constructor(private apiKey: string) {}

  async fetch(path: string, options: AxiosRequestConfig = {}) {
    options.headers = {
      ...(options.headers || {}),
      Authorization: this.apiKey,
    };

    options.method = options.method || 'GET';

    const { data } = await api(`/v1/public/${path}`, options);

    if (data.status === 'error') {
      throw new SquareCloudAPIError(data.code);
    }

    return data;
  }

  user(id?: string, options: AxiosRequestConfig = {}): Promise<RawUserData> {
    return this.fetch('user' + (id ? `/${id}` : ''), options).then(
      (e) => e.response
    );
  }

  application(
    path: string,
    id: string,
    options: AxiosRequestConfig | boolean = {}
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
