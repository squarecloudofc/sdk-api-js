import { UserPlan } from './api';

export interface UserPlanData extends Omit<UserPlan, 'duration'> {
  /** When the plan was purchased in millisseconds */
  expiresTimestamp?: number;
  /** When the plan was purchased */
  expires?: Date;
}
