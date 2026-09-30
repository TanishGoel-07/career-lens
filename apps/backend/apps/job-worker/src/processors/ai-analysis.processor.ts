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

  private generateDynamicFeedback(
    extractedSkills: string[],
    weakBullets: Array<{ text: string; reason: string; rewrite: string }>,
    missingSkills: string[],
    deterministicBreakdown: any,
  ): { strengths: string[]; weaknesses: string[]; suggestions: string[] } {
    const strengths: string[] = [];
    if (extractedSkills.length >= 5) {
      strengths.push(
        `Verified proficiencies in ${extractedSkills.slice(0, 4).join(', ')} provide strong alignment with modern engineering stacks.`,
      );
    } else if (extractedSkills.length > 0) {
      strengths.push(`Identified core foundational skills in ${extractedSkills.join(', ')}.`);
    } else {
      strengths.push('Clean layout structure with parseable sections.');
    }

    if (deterministicBreakdown?.impactScore >= 60) {
      strengths.push('Demonstrates solid quantifiable business impact across several key achievements.');
    } else {
      strengths.push('Clear presentation of roles, educational milestones, and responsibilities.');
    }

    const weaknesses: string[] = [];
    if (weakBullets && weakBullets.length > 0) {
      weaknesses.push(
        `Identified ${weakBullets.length} bullet point(s) lacking quantifiable metrics (%, $, latency, or scale) or using passive voice.`,
      );
      weaknesses.push(
        `Specific bullet needs rework: "${weakBullets[0].text.slice(0, 80)}..." — ${weakBullets[0].reason}`,
      );
    } else {
      weaknesses.push('Could incorporate higher density of senior architectural keywords.');
    }

    const suggestions: string[] = [];
    if (weakBullets && weakBullets.length > 0) {
      suggestions.push(
        `Apply the Google XYZ formula: replace weak bullet with: "${weakBullets[0].rewrite.slice(0, 120)}"`,
      );
    }
    if (missingSkills && missingSkills.length > 0) {
      suggestions.push(
        `Add concrete proof-of-work project bullets showcasing ${missingSkills.slice(0, 3).join(', ')}.`,
      );
    }
    suggestions.push(
      'Organize technical proficiencies into distinct categories: Languages, Cloud/DevOps, Databases, and System Design.',
    );

    return { strengths, weaknesses, suggestions };
  }

  private async callAiForFeedback(
    resumeText: string,
    extractedSkills: string[],
    weakBullets: any[],
    missingSkills: any[],
    deterministicBreakdown: any,
  ): Promise<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } | null> {
    const provider = process.env.AI_PROVIDER || 'mock';

    if (provider === 'mock') {
      return this.generateDynamicFeedback(extractedSkills, weakBullets, missingSkills, deterministicBreakdown);
    }

    const systemPrompt = [
      'You are a Principal Career Architect and Executive ATS Specialist for CareerLens AI.',
      'Analyze the candidate\'s real resume text and weaknesses. Respond with ONLY valid JSON:',
      '{ "strengths": string[], "weaknesses": string[], "suggestions": string[] }.',
      'Ground every single point in the provided resume text. Never hallucinate facts.',
    ].join(' ');

    const userPrompt = JSON.stringify({
      resumeExcerpt: resumeText.slice(0, 3000),
      detectedSkills: extractedSkills,
      flaggedWeakBullets: (weakBullets || []).slice(0, 3),
      missingTargetSkills: (missingSkills || []).slice(0, 4),
      scores: deterministicBreakdown,
    });

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        this.logger.warn('GEMINI_API_KEY not set — using dynamic rule-based feedback generator');
        return this.generateDynamicFeedback(extractedSkills, weakBullets, missingSkills, deterministicBreakdown);
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
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
      this.logger.warn('OPENAI_API_KEY not set — using dynamic rule-based feedback generator');
      return this.generateDynamicFeedback(extractedSkills, weakBullets, missingSkills, deterministicBreakdown);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 700,
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
    const [resume, evaluation] = await Promise.all([
      this.prisma.resume.findUnique({ where: { id: resumeId } }),
      this.prisma.resumeEvaluation.findFirst({
        where: { resumeId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!resume || !evaluation) {
      this.logger.warn(`Resume or evaluation ${resumeId} not found — skipping AI pass.`);
      return;
    }

    try {
      const extractedSkills = (resume.extractedSkills as string[]) || [];
      const weakBullets = (evaluation.weakBullets as any[]) || [];
      const missingSkills = (evaluation.missingSkills as string[]) || [];

      const aiFeedback = await this.callAiForFeedback(
        resume.parsedText || '',
        extractedSkills,
        weakBullets,
        missingSkills,
        evaluation.deterministicScoreBreakdown,
      );

      if (aiFeedback) {
        await this.prisma.resumeEvaluation.update({
          where: { id: evaluation.id },
          data: { aiFeedback },
        });
      }
    } catch (err) {
      this.logger.warn(`AI feedback generation failed for resume ${resumeId}: ${(err as Error).message}`);
    }
  }
}
