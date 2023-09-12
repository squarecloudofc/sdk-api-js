import { validateString } from '../assertions';
import { Prompt } from '../types/experimental';
import APIManager from './api';

export default class ExperimentalManager {
  readonly #apiManager: APIManager;

  constructor(apiManager: APIManager) {
    this.#apiManager = apiManager;
  }

  /**
   * @experimental
   * **May have bugs.**
   * The new Square Cloud experimental AI feature.
   *
   * @param prompt.question - Short question for the AI to answer :)
   * @param prompt.context - Subject, humor or previous conversations
   */
  async askAi(prompt: Prompt): Promise<string> {
    if (prompt.context) {
      validateString(prompt.context);
    }
    validateString(prompt.question);

    const { response } = await this.#apiManager.fetch<string>(
      'ai',
      {
        method: 'POST',
        body: JSON.stringify({
          question: prompt.question,
          prompt: prompt.context,
        }),
      },
      'v1',
      'experimental',
    );

    return response;
  }
}
