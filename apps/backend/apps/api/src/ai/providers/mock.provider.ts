import { Injectable } from '@nestjs/common';
import { AiCompletionRequest, AiCompletionResult, AiProvider } from './ai-provider.interface';

/**
 * Deterministic, zero-cost provider used in tests and local dev so the
 * ENTIRE pipeline (prompt building -> schema validation -> persistence)
 * is exercised without a real API key or nondeterministic output.
 *
 * It returns valid JSON matching whatever shape the caller's schema
 * expects for known feature prompts, and falls back to a generic
 * canned string otherwise — good enough to keep contract tests honest
 * without needing per-feature branching logic to grow unbounded.
 */
@Injectable()
export class MockProvider implements AiProvider {
  readonly name = 'mock';

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const text = req.systemPrompt.includes('resume-feedback')
      ? JSON.stringify({
          strengths: ['Clear ownership of measurable outcomes in recent role.'],
          weaknesses: ['Several bullets lack quantified impact.'],
          suggestions: ['Add a metric (%, $, time saved) to each experience bullet.'],
        })
      : req.systemPrompt.includes('match-explanation')
        ? JSON.stringify({
            explanation:
              'Strong overlap on core required skills; missing one optional skill that is easy to pick up given existing experience.',
          })
        : JSON.stringify({ text: 'Mock response.' });

    return {
      text,
      inputTokens: Math.ceil((req.systemPrompt.length + req.userPrompt.length) / 4),
      outputTokens: Math.ceil(text.length / 4),
      model: 'mock-1',
    };
  }
}
