import { Application } from './structures/Application';
import { User } from './structures/User';
export declare class SquareCloudAPI {
    static apiInfo: {
        version: string;
        baseUrl: string;
    };
    private apiManager;
    /**
     * Creates an API instance
     *
     * @param apiKey - Your API Token (you can get it at [SquareCloud Dashboard](https://squarecloud.app/dashboard))
     */
    constructor(apiKey: string);
    /**
     * Gets a user's informations
     *
     * @param userId - The user id, if not provided it will get your own information
     */
    getUser(userId?: string): Promise<User>;
    /**
     * Returns an application that you can manage or get information
     *
     * @param appId - The application id, you must own the application
     */
    getApplication(appId: string): Promise<Application>;
}
