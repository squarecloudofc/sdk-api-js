import { APIResponse, RawUserData } from './typings';
import { AxiosRequestConfig } from 'axios';
export declare class SquareCloudAPIError extends Error {
    constructor(code: string);
}
export declare class APIManager {
    private apiKey;
    constructor(apiKey: string);
    private fetch;
    user(id?: string, options?: AxiosRequestConfig): Promise<RawUserData>;
    application(path: string, id: string, options?: AxiosRequestConfig | boolean): Promise<APIResponse>;
}
