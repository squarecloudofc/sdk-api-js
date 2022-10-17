/// <reference types="node" />
import { ReadStream } from 'fs';
export declare function validateString(value: any): asserts value is string;
export declare function validateBoolean(value: any): asserts value is boolean;
export declare function validateCommitLike(value: any): asserts value is string | ReadStream;
