import { RawUserData } from './typings';
export declare class SquareCloudAPIError extends Error {
}
export declare class APIManager {
    private apiKey;
    constructor(apiKey: string);
    private fetch;
    user(id?: string, options?: RequestInit): Promise<RawUserData>;
    application(path: string, id: string, post?: boolean): Promise<any>;
}
