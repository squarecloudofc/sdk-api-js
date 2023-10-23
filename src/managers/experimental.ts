import { SquareCloudAPI } from '..';
import { validateString } from '../assertions';
import { Prompt } from '../types/experimental';

export default class ExperimentalManager {
  constructor(public readonly client: SquareCloudAPI) {}

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

    const { response } = await this.client.api.fetch<string>(
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
