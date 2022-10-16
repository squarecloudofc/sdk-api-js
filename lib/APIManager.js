"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIManager = exports.SquareCloudAPIError = void 0;
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
    fetch(path, options = {}) {
        return fetch('https://api.squarecloud.app/v1/public/' + path, {
            ...options,
            headers: { Authorization: this.apiKey },
        })
            .then((e) => e.json())
            .then((e) => {
            if (e.status === 'error') {
                throw new SquareCloudAPIError(e.code);
            }
            return e;
        });
    }
    user(id, options = {}) {
        return this.fetch('user' + (id ? `/${id}` : ''), options).then((data) => data.response);
    }
    application(path, id, options = {}) {
        return this.fetch(`${path}/${id}`, typeof options === 'boolean'
            ? options
                ? { method: 'POST' }
                : {}
            : options).then((data) => data.response);
    }
}
exports.APIManager = APIManager;
