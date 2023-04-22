import SquareCloudAPIError from '../structures/error';
import { APIRootPath, APIVersion, UserResponse } from '../types';
import { APIResponse } from '../types';

export default class APIManager {
  public readonly baseUrl = 'https://api.squarecloud.app';

  constructor(readonly apiKey: string) {}

  user(userId?: string): Promise<APIResponse<UserResponse>> {
    return this.fetch('user' + (userId ? `/${userId}` : ''));
  }

  application(
    path: string,
    appId: string,
    options?: RequestInit | 'GET' | 'POST' | 'DELETE'
  ): Promise<APIResponse> {
    if (typeof options === 'string') {
      options = {
        method: options,
      };
    }

    return this.fetch(`apps/${appId}/${path}`, options);
  }

  async fetch(
    path: string,
    options: RequestInit = {},
    version: APIVersion<1 | 2> = 'v2',
    rootPath?: APIRootPath
  ): Promise<APIResponse> {
    options = {
      ...options,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}), Authorization: this.apiKey },
    };

    const res = await fetch(
      `${this.baseUrl}/${version}${rootPath ? `/${rootPath}` : ''}/${path}`,
      options
    ).catch((err) => {
      throw new SquareCloudAPIError(err.code);
    });
    const data = await res.json();

    if (!data || data.status === 'error' || !res.ok) {
      throw new SquareCloudAPIError(data?.code || 'COMMON_ERROR');
    }

    return data;
  }
}
