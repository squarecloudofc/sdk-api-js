"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullUser = exports.User = void 0;
const Application_1 = require("./Application");
/**
 * Represents a SquareCloud user
 *
 * @constructor
 * @param apiManager - The APIManager for this user
 * @param data - The data from this user
 */
class User {
    apiManager;
    /** The user's id */
    id;
    /** The user's Discord tag */
    tag;
    /** The user's current plan */
    plan;
    /** Whether you have access to private information or not */
    hasAccess;
    constructor(apiManager, data) {
        this.apiManager = apiManager;
        this.id = data.user.id;
        this.tag = data.user.tag;
        this.plan = {
            ...data.user.plan,
            duration: {
                formatted: data.user.plan.duration.formatted,
                timestamp: data.user.plan.duration.raw,
            },
        };
        this.hasAccess = () => data.user.email !== 'Access denied';
    }
    /** Fetches the user data again and returns a new User */
    fetch() {
        return this.apiManager
            .user(this.id)
            .then((data) => new (this.hasAccess() ? FullUser : User)(this.apiManager, data));
    }
}
exports.User = User;
class FullUser extends User {
    /** The user's registered email */
    email;
    /** The user's registered applications */
    applications;
    constructor(apiManager, data) {
        super(apiManager, data);
        this.email = data.user.email;
        this.applications = data.applications.map((data) => new Application_1.Application(apiManager, data));
    }
}
exports.FullUser = FullUser;
