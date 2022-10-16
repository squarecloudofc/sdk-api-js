import { AccountPlan, RawUserData } from '../typings';
import { Application } from './Application';
import { APIManager } from '../APIManager';
export declare class User {
    private apiManager;
    /** The user's id */
    id: string;
    /** The user's Discord tag */
    tag: string;
    /** The user's current plan */
    plan: AccountPlan;
    /** Whether you have access to private information or not */
    hasAccess: () => this is FullUser;
    constructor(apiManager: APIManager, data: RawUserData);
    /** Fetches the user data again and returns a new User */
    fetch(): Promise<User>;
}
export declare class FullUser extends User {
    /** The user's registered email */
    email: string;
    /** The user's registered applications */
    applications: Application[];
    constructor(apiManager: APIManager, data: RawUserData);
}
