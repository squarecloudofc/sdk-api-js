import { UserPlan } from './api';

export interface UserPlanData extends Omit<UserPlan, 'duration'> {
  /** The formatted plan duration */
  duration: string;
  /** When the plan was purchased in millisseconds */
  purchasedTimestamp?: number;
  /** When the plan was purchased */
  purchased?: Date;
}
