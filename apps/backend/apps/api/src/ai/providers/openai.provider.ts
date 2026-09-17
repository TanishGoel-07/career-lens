import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCompletionRequest, AiCompletionResult, AiProvider } from './ai-provider.interface';

/**
 * Thin wrapper around the OpenAI Chat Completions API. Kept dependency-
 * free (plain fetch) so this package doesn't need to pin the `openai`
 * SDK version independently of the rest of the app.
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  private readonly model = 'gpt-4o-mini';

  constructor(private readonly config: ConfigService) {}

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
        max_tokens: req.maxOutputTokens ?? 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as any;
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      model: this.model,
    };
  }
}
