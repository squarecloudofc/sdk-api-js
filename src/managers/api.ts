import SquareCloudAPIError from '../structures/error';
import {
  APIApplicationEndpoints,
  APIResponse,
  APIVersion,
  UserResponse,
} from '../types';

export default class APIManager {
  public readonly baseUrl = 'https://api.squarecloud.app';

  constructor(readonly apiKey: string) {}

  user(userId?: string): Promise<APIResponse<UserResponse>> {
    return this.fetch('user' + (userId ? `/${userId}` : ''));
  }

  application<T extends keyof APIApplicationEndpoints | (string & {})>(
    path: T,
    appId?: string,
    params?: Record<string, string>,
    options?: RequestInit | 'GET' | 'POST' | 'DELETE',
  ): Promise<
    APIResponse<
      T extends keyof APIApplicationEndpoints ? APIApplicationEndpoints[T] : any
    >
  > {
    if (typeof options === 'string') {
      options = {
        method: options,
      };
    }

    const url =
      'apps' +
      (appId ? `/${appId}` : '') +
      `/${path}` +
      (params ? `?${new URLSearchParams(params)}` : '');

    return this.fetch(url, options);
  }

  async fetch<T extends any = any>(
    path: string,
    options: RequestInit = {},
    version: APIVersion<1 | 2> = 'v2',
  ): Promise<APIResponse<T>> {
    options.method = options.method || 'GET';
    options.headers = {
      ...(options.headers || {}),
      Authorization: this.apiKey,
    };

    const res = await fetch(
      `${this.baseUrl}/${version}/${path}`,
      options,
    ).catch((err) => {
      throw new SquareCloudAPIError(err.code, err.message);
    });

    const data = await res.json();

    if (!data || data.status === 'error' || !res.ok) {
      throw new SquareCloudAPIError(data?.code || 'COMMON_ERROR');
    }

    return data;
  }
}
