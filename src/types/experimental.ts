export interface Prompt {
  /** Short question for the AI to answer */
  question: string;
  /** Subject, humor or previous conversations */
  context?: string;
}
