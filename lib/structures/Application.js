"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const Assertions_1 = require("../Assertions");
const fs_1 = require("fs");
const form_data_1 = __importDefault(require("form-data"));
/**
 * Represents a SquareCloud application
 *
 * @constructor
 * @param apiManager - The APIManager for this application
 * @param data - The data from this application
 */
class Application {
    apiManager;
    /** The application id */
    id;
    /** The application Discord tag */
    tag;
    /** The application total ram */
    ram;
    /**
     * The application programming language
     *
     * - 'javascript'
     * - 'typescript'
     * - 'python'
     * - 'java'
     */
    lang;
    /** The application plan type (free' or 'paid') */
    type;
    /** The application avatar URL */
    avatar;
    /** The application current cluster */
    cluster;
    /** Whether the application is a website or not */
    isWebsite;
    constructor(apiManager, data) {
        this.apiManager = apiManager;
        this.id = data.id;
        this.tag = data.tag;
        this.ram = data.ram;
        this.lang = data.lang;
        this.type = data.type;
        this.avatar = data.avatar;
        this.cluster = data.cluster;
        this.isWebsite = data.isWebsite;
    }
    /** Gets the application's current information */
    async getStatus() {
        const { network, cpu, ram, storage, requests, running, status, uptime, time, } = (await this.apiManager.application('status', this.id)).response;
        return {
            status,
            running,
            network,
            requests,
            cpuUsage: cpu,
            ramUsage: ram,
            storageUsage: storage,
            uptimeTimestamp: uptime || 0,
            uptime: uptime ? new Date(uptime) : null,
            lastCheckTimestamp: time,
            lastCheck: time ? new Date(time) : undefined,
        };
    }
    /** Gets the application logs
     *
     * @param full - Whether you want the complete logs (true) or the recent ones (false)
     */
    async getLogs(full = false) {
        (0, Assertions_1.validateBoolean)(full);
        return (await this.apiManager.application(`${full ? 'full-' : ''}logs`, this.id)).response.logs;
    }
    /** Generates the backup download URL */
    async backup() {
        return (await this.apiManager.application('backup', this.id)).response
            .downloadURL;
    }
    /** Starts up the application */
    async start() {
        const { code } = await this.apiManager.application('start', this.id, true);
        return code === 'ACTION_SENT';
    }
    /** Stops the application */
    async stop() {
        const { code } = await this.apiManager.application('stop', this.id, true);
        return code === 'ACTION_SENT';
    }
    /** Restarts the application */
    async restart() {
        const { code } = await this.apiManager.application('restart', this.id, true);
        return code === 'ACTION_SENT';
    }
    /**
     * Deletes your whole application
     *
     * - This action is irreversible.
     */
    async delete() {
        const { code } = await this.apiManager.application('delete', this.id, true);
        return code === 'APP_DELETED';
    }
    /**
     * Commit changes to a specific file inside your application folder
     *
     * - This action is irreversible.
     * - Tip: use `require('path').join(__dirname, 'fileName')` to get an absolute path.
     *
     * @param file - The absolute file path or a Buffer
     */
    async commit(file) {
        (0, Assertions_1.validatePathLike)(file);
        const formData = new form_data_1.default();
        formData.append('file', (0, fs_1.createReadStream)(file));
        const { code } = await this.apiManager.application('commit', this.id, {
            method: 'POST',
            data: formData,
            headers: { ...formData.getHeaders() },
        });
        return code === 'SUCCESS';
    }
}
exports.Application = Application;
