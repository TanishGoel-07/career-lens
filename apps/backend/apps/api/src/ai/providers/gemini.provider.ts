import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCompletionRequest, AiCompletionResult, AiProvider } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private readonly model = 'gemini-1.5-flash';

  constructor(private readonly config: ConfigService) {}

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
        generationConfig: {
          maxOutputTokens: req.maxOutputTokens ?? 800,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const usage = data.usageMetadata ?? {};
    return {
      text,
      inputTokens: usage.promptTokenCount ?? 0,
      outputTokens: usage.candidatesTokenCount ?? 0,
      model: this.model,
    };
  }
}
