import { validateString } from '../assertions';
import { APIResponse } from '../types';
import { Prompt } from '../types/experimental';
import APIManager from './api';

export default class ExperimentalManager {
  constructor(private readonly apiManager: APIManager) {}

  /**
   * @experimental
   * **May have bugs.**
   * The new Square Cloud experimental AI feature.
   *
   * @param prompt.question - Short question for the AI to answer :)
   * @param prompt.context - Subject, humor or previous conversations
   */
  async askAi(prompt: Prompt) {
    if (prompt.context) {
      validateString(prompt.context);
    }
    validateString(prompt.question);

    const { response } = <APIResponse<string>>await this.apiManager.fetch(
      'ai',
      {
        method: 'POST',
        body: JSON.stringify({
          question: prompt.question,
          prompt: prompt.context,
        }),
      },
      'v1',
      'experimental'
    );

    return response;
  }
}