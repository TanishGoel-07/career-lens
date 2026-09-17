export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
}

export interface AiCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Common interface every provider implements (architecture doc §12).
 * The AI Gateway depends on THIS, never on a specific SDK — swapping
 * OpenAI for Gemini, or either for MockProvider in tests, never touches
 * calling code.
 */
export interface AiProvider {
  readonly name: string;
  complete(req: AiCompletionRequest): Promise<AiCompletionResult>;
}
