"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIManager = exports.SquareCloudAPIError = void 0;
const axios_1 = __importDefault(require("axios"));
const errorMessages = {
    ACCESS_DENIED: 'You do not have authorization to perform this action.',
    APP_NOT_FOUND: 'Cannot find any application with provided information.',
    USER_NOT_FOUND: 'Cannot find any user with provided information.',
    INVALID_BUFFER: 'Provided buffer is invalid.',
};
class SquareCloudAPIError extends Error {
    constructor(code) {
        super();
        this.name = 'SquareCloudAPIError';
        this.message = `[${code}] ${errorMessages[code]}`;
    }
}
exports.SquareCloudAPIError = SquareCloudAPIError;
class APIManager {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async fetch(path, options = {}) {
        options.headers = {
            ...(options.headers || {}),
            Authorization: this.apiKey,
        };
        options.method = options.method || 'GET';
        const { data } = await (0, axios_1.default)('https://api.squarecloud.app/v1/public/' + path, options);
        if (data.status === 'error') {
            throw new SquareCloudAPIError(data.code);
        }
        return data;
    }
    user(id, options = {}) {
        return this.fetch('user' + (id ? `/${id}` : ''), options).then((e) => e.response);
    }
    application(path, id, options = {}) {
        return this.fetch(`${path}/${id}`, typeof options === 'boolean'
            ? options
                ? { method: 'POST' }
                : {}
            : options);
    }
}
exports.APIManager = APIManager;
