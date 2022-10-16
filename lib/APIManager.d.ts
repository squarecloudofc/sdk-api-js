import { AxiosRequestConfig } from 'axios';
import { APIResponse, RawUserData } from './typings';
declare const errorMessages: {
    ACCESS_DENIED: string;
    APP_NOT_FOUND: string;
    USER_NOT_FOUND: string;
    INVALID_BUFFER: string;
};
export declare class SquareCloudAPIError extends Error {
    constructor(code: keyof typeof errorMessages);
}
export declare class APIManager {
    private apiKey;
    constructor(apiKey: string);
    private fetch;
    user(id?: string, options?: AxiosRequestConfig): Promise<RawUserData>;
    application(path: string, id: string, options?: AxiosRequestConfig | boolean): Promise<APIResponse>;
}
export {};
