"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIManager = exports.SquareCloudAPIError = void 0;
class SquareCloudAPIError extends Error {
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
        }).then((e) => {
            if (e.status === 401) {
                throw new SquareCloudAPIError('You do not have authorization to perform this action.');
            }
            if (e.status === 404) {
                throw new SquareCloudAPIError('The provided parameters are invalid. No data found.');
            }
            return e.json();
        });
    }
    user(id, options = {}) {
        return this.fetch('user' + (id ? `/${id}` : ''), options).then((data) => data.response);
    }
    application(path, id, post) {
        return this.fetch(`${path}/${id}`, post ? { method: 'POST' } : {}).then((data) => data.response);
    }
}
exports.APIManager = APIManager;
