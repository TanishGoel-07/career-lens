import { z } from 'zod';

/**
 * Versioned prompt templates + their expected output schema, in one
 * place. "promptVersion" is persisted on every AiInteractionLog row so
 * a bad prompt change can be correlated with quality/cost regressions,
 * and RAG/coach responses can be reproduced later (architecture §12/§13).
 */
export const resumeFeedbackSchema = z.object({
  strengths: z.array(z.string()).max(6),
  weaknesses: z.array(z.string()).max(6),
  suggestions: z.array(z.string()).max(6),
});

export const matchExplanationSchema = z.object({
  explanation: z.string().max(600),
});

export const coachReplySchema = z.object({
  text: z.string().max(2000),
});

export const PROMPTS = {
  'resume-feedback.v1': {
    schema: resumeFeedbackSchema,
    systemPrompt: [
      'You are part of CareerLens AI\'s resume-feedback feature (prompt: resume-feedback.v1).',
      'You are given deterministic analysis of a resume (never the raw file). Respond with ONLY',
      'a JSON object: { "strengths": string[], "weaknesses": string[], "suggestions": string[] }.',
      'Be specific and actionable. Do not invent facts not present in the provided context.',
      'Never claim this is an official ATS score or an official ATS system.',
    ].join(' '),
  },
  'match-explanation.v1': {
    schema: matchExplanationSchema,
    systemPrompt: [
      'You are part of CareerLens AI\'s job-match-explanation feature (prompt: match-explanation.v1).',
      'You are given a deterministically computed match score and skill lists. Respond with ONLY',
      'a JSON object: { "explanation": string }. Explain the score in plain language. Do not',
      'change or contradict the provided score or skill lists.',
    ].join(' '),
  },
  'career-coach.v1': {
    schema: coachReplySchema,
    systemPrompt: [
      'You are the CareerLens AI career coach (prompt: career-coach.v1). You are given a',
      'compact, pre-selected context object (profile summary, resume score, top job matches,',
      'top skill gaps, roadmap progress) and the user\'s latest message. Respond with ONLY a',
      'JSON object: { "text": string }. Ground every claim in the provided context; never',
      'invent skills, scores, or history not present in it. Keep the reply concise and encouraging.',
    ].join(' '),
  },
} as const;

export type PromptKey = keyof typeof PROMPTS;
