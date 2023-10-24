import type Application from '../structures/application';
import User from '../structures/user';
import { ApplicationStatusData } from './application';

export * from './api';
export * from './enums';

export type APIVersion<TVersion extends number> = `v${TVersion}`;

export interface APIEvents {
  logsUpdate: [
    application: Application,
    before: string | undefined,
    after: string,
  ];
  backupUpdate: [
    application: Application,
    before: string | undefined,
    after: string,
  ];
  statusUpdate: [
    application: Application,
    before: ApplicationStatusData | undefined,
    after: ApplicationStatusData,
  ];
  userUpdate: [before: User | undefined, after: User];
}
