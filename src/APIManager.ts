import axios, { AxiosRequestConfig } from 'axios';
import { RawUserData } from './typings';

const errorMessages = {
  ACCESS_DENIED: 'You do not have authorization to perform this action.',
  APP_NOT_FOUND: 'Cannot find any application with provided information.',
  USER_NOT_FOUND: 'Cannot find any user with provided information.',
  INVALID_BUFFER: 'Provided buffer is invalid.',
};

export class SquareCloudAPIError extends Error {
  constructor(code: keyof typeof errorMessages) {
    super();

    this.name = 'SquareCloudAPIError';
    this.message = `[${code}] ${errorMessages[code]}`;
  }
}

export class APIManager {
  constructor(private apiKey: string) {}

  private async fetch(path: string, options: AxiosRequestConfig = {}) {
    options.headers = {
      ...(options.headers || {}),
      Authorization: this.apiKey,
    };

    options.method = options.method || 'GET';

    const { data } = await axios(
      'https://api.squarecloud.app/v1/public/' + path,
      options
    );

    if (data.status === 'error') {
      throw new SquareCloudAPIError(data.code as keyof typeof errorMessages);
    }

    return data;
  }

  user(id?: string, options: AxiosRequestConfig = {}): Promise<RawUserData> {
    return this.fetch('user' + (id ? `/${id}` : ''), options).then(
      (data) => data.response
    );
  }

  application(
    path: string,
    id: string,
    options: AxiosRequestConfig | boolean = {}
  ) {
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
