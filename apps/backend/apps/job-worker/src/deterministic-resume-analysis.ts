/**
 * Deterministic resume analysis helpers — the non-AI half of the
 * hybrid engine (architecture §7). Kept as plain functions (no NestJS
 * DI needed) so they're trivially unit-testable in isolation.
 */

const SECTION_HEADERS = [
  'summary',
  'experience',
  'work experience',
  'education',
  'skills',
  'projects',
  'certifications',
];

const SKILL_TAXONOMY = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'sql', 'postgresql', 'mongodb',
  'react', 'node.js', 'express', 'nestjs', 'docker', 'kubernetes', 'aws', 'gcp', 'azure',
  'redis', 'graphql', 'rest api', 'ci/cd', 'git', 'system design', 'microservices',
];

export function normalizeText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function detectSections(text: string): Record<string, boolean> {
  const lower = text.toLowerCase();
  const found: Record<string, boolean> = {};
  for (const header of SECTION_HEADERS) {
    found[header] = lower.includes(header);
  }
  return found;
}

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_TAXONOMY.filter((skill) => lower.includes(skill));
}

/** Bullet lines containing a number, %, or currency symbol near an action verb. */
export function scoreQuantifiedImpact(text: string): number {
  const bulletLines = text.split('\n').filter((l) => /^[\s]*[-•*]/.test(l));
  if (bulletLines.length === 0) return 0;
  const quantified = bulletLines.filter((l) => /\d|%|\$/.test(l));
  return Math.round((quantified.length / bulletLines.length) * 100) / 100;
}

export function scoreFormatting(text: string): number {
  const lines = text.split('\n').filter(Boolean);
  const bulletLines = lines.filter((l) => /^[\s]*[-•*]/.test(l));
  const avgBulletLength =
    bulletLines.length > 0
      ? bulletLines.reduce((sum, l) => sum + l.length, 0) / bulletLines.length
      : 0;
  // Reasonable bullet length (40-160 chars) scores highest; very short or
  // very long bullets are penalized. Deterministic, explainable rule.
  if (avgBulletLength === 0) return 0.3;
  if (avgBulletLength >= 40 && avgBulletLength <= 160) return 1;
  return 0.6;
}

export interface DeterministicBreakdown {
  sectionsScore: number;
  keywordScore: number;
  formattingScore: number;
  impactScore: number;
  sections: Record<string, boolean>;
  extractedSkills: string[];
}

export function computeDeterministicBreakdown(text: string): DeterministicBreakdown {
  const sections = detectSections(text);
  const sectionsPresent = Object.values(sections).filter(Boolean).length;
  const sectionsScore = Math.round((sectionsPresent / SECTION_HEADERS.length) * 100) / 100;

  const extractedSkills = extractSkills(text);
  const keywordScore = Math.min(1, extractedSkills.length / 10);

  const formattingScore = scoreFormatting(text);
  const impactScore = scoreQuantifiedImpact(text);

  return { sectionsScore, keywordScore, formattingScore, impactScore, sections, extractedSkills };
}

export function overallScoreFromBreakdown(b: DeterministicBreakdown): number {
  // Explicit, documented weights — never fabricated, always the same
  // formula that appears in the persisted breakdown so it's auditable.
  const weighted =
    b.sectionsScore * 0.25 + b.keywordScore * 0.3 + b.formattingScore * 0.2 + b.impactScore * 0.25;
  return Math.round(weighted * 100);
}
