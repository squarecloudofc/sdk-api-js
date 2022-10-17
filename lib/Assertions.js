"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCommitLike = exports.validateBoolean = exports.validateString = void 0;
const fs_1 = require("fs");
const zod_1 = __importDefault(require("zod"));
function validateString(value) {
    zod_1.default.string().parse(value);
}
exports.validateString = validateString;
function validateBoolean(value) {
    zod_1.default.boolean().parse(value);
}
exports.validateBoolean = validateBoolean;
function validateCommitLike(value) {
    zod_1.default.string()
        .or(zod_1.default.custom((value) => value instanceof fs_1.ReadStream))
        .parse(value);
}
exports.validateCommitLike = validateCommitLike;
