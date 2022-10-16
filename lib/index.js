"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SquareCloudAPI = void 0;
const APIManager_1 = require("./APIManager");
const Application_1 = require("./structures/Application");
const User_1 = require("./structures/User");
class SquareCloudAPI {
    static apiInfo = {
        version: 'v1',
        baseUrl: 'https://api.squarecloud.app/v1/public/',
    };
    apiManager;
    /**
     * Creates an API instance
     *
     * @param apiKey - Your API Token (you can get it at [SquareCloud Dashboard](https://squarecloud.app/dashboard))
     */
    constructor(apiKey) {
        if (typeof apiKey !== 'string') {
            throw new TypeError('apiKey must be a string. Got ' + typeof apiKey);
        }
        this.apiManager = new APIManager_1.APIManager(apiKey);
    }
    /**
     * Gets a user's informations
     *
     * @param userId - The user id, if not provided it will get your own information
     */
    async getUser(userId) {
        if (userId && typeof userId !== 'string') {
            throw new TypeError('userId must be a string. Got ' + typeof userId);
        }
        const userData = (await this.apiManager.user(userId));
        const hasAccess = userData.user.email !== 'Access denied';
        return new (hasAccess ? User_1.FullUser : User_1.User)(this.apiManager, userData);
    }
    /**
     * Returns an application that you can manage or get information
     *
     * @param appId - The application id, you must own the application
     */
    async getApplication(appId) {
        if (typeof appId !== 'string') {
            throw new TypeError('appId must be a string. Got ' + typeof appId);
        }
        const { applications } = (await this.apiManager.user());
        const appData = applications.find((app) => app.id === appId);
        if (!appData) {
            throw new APIManager_1.SquareCloudAPIError('APP_NOT_FOUND');
        }
        return new Application_1.Application(this.apiManager, appData);
    }
}
exports.SquareCloudAPI = SquareCloudAPI;
