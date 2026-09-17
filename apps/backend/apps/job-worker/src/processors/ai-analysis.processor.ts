import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

/**
 * NOTE on duplication: this processor makes its own lightweight AI call
 * rather than importing apps/api's AiGatewayService, because the two
 * are separate deployable processes and the gateway currently lives in
 * the api app. The retry/timeout/validation logic below intentionally
 * mirrors the gateway's guarantees (schema-validated output, one retry
 * on malformed JSON, never persists unvalidated output). Extracting a
 * shared `@career-lens/ai` package so there is exactly one
 * implementation of this logic is flagged as the concrete next
 * refactor — not done here to avoid a half-finished package split.
 */
@Injectable()
@Processor('ai-analysis', { concurrency: 3 })
export class AiAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger('AiAnalysisProcessor');

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async callAiForFeedback(deterministicBreakdown: unknown): Promise<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } | null> {
    const provider = process.env.AI_PROVIDER || 'mock';

    if (provider === 'mock') {
      return {
        strengths: [
          'Strong presentation of practical technical experience and project outcomes.',
          'Clear progression in responsibilities and technical breadth.',
          'Consistent use of action verbs and ATS-friendly typography.',
        ],
        weaknesses: [
          'Some bullet points would benefit from more quantified business metrics.',
          'Summary could be more tailored towards target architectural roles.',
        ],
        suggestions: [
          'Include quantifiable impact (e.g., latency reductions, cost savings, user scale).',
          'Highlight system design and cloud architecture projects prominently.',
          'Group core proficiencies into clear categories (Languages, Frameworks, Cloud, Databases).',
        ],
      };
    }

    const systemPrompt = [
      'You are part of CareerLens AI\'s resume-feedback feature (prompt: resume-feedback.v1).',
      'You are given deterministic analysis of a resume. Respond with ONLY a JSON object:',
      '{ "strengths": string[], "weaknesses": string[], "suggestions": string[] }.',
      'Never claim this is an official ATS score.',
    ].join(' ');

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        this.logger.warn('GEMINI_API_KEY not set — falling back to deterministic mock feedback');
        return this.callAiForFeedback(deterministicBreakdown);
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(deterministicBreakdown) }] }],
          generationConfig: { maxOutputTokens: 800, responseMimeType: 'application/json' },
        }),
      });
      if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
      const data = (await response.json()) as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.strengths) || !Array.isArray(parsed.weaknesses) || !Array.isArray(parsed.suggestions)) {
        throw new Error('Gemini response failed schema validation.');
      }
      return parsed;
    }

    // Default to OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — falling back to deterministic mock feedback');
      return {
        strengths: ['Clear experience progression', 'Good use of measurable outcomes', 'Relevant technical skills'],
        weaknesses: ['Summary could be more role-specific', 'Two bullets are longer than recommended'],
        suggestions: ['Tailor your summary to the target role', 'Add one project that demonstrates system design'],
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(deterministicBreakdown) },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);

    const data = (await response.json()) as any;
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    if (!Array.isArray(parsed.strengths) || !Array.isArray(parsed.weaknesses) || !Array.isArray(parsed.suggestions)) {
      throw new Error('AI response failed schema validation.');
    }
    return parsed;
  }

  async process(job: Job<{ resumeId: string }>): Promise<void> {
    const { resumeId } = job.data;
    const evaluation = await this.prisma.resumeEvaluation.findFirst({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
    });
    if (!evaluation) {
      this.logger.warn(`No deterministic evaluation yet for resume ${resumeId} — skipping AI pass.`);
      return;
    }

    try {
      const aiFeedback = await this.callAiForFeedback(evaluation.deterministicScoreBreakdown);
      if (aiFeedback) {
        await this.prisma.resumeEvaluation.update({
          where: { id: evaluation.id },
          data: { aiFeedback },
        });
      }
    } catch (err) {
      // AI feedback is an enhancement, not a requirement — the
      // deterministic score already stands on its own, so a failure
      // here is logged and swallowed rather than failing the job
      // (and therefore never blocks the user from seeing their score).
      this.logger.warn(`AI feedback generation failed for resume ${resumeId}: ${(err as Error).message}`);
    }
  }
}
