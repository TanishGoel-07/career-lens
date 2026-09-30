/**
 * CareerLens AI — Production Resume Intelligence Engine
 * Comprehensive Deterministic ATS Parser, Section Segmenter, Skill Extractor,
 * Metric & Impact Evaluator, Line-by-Line Weak Bullet Detector, and Resume Rewriter.
 */

export const COMPREHENSIVE_SKILL_TAXONOMY: Record<string, string[]> = {
  languages: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'golang', 'go', 'rust',
    'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'sql', 'r', 'matlab', 'bash', 'shell',
    'c', 'html', 'css', 'sass', 'graphql',
  ],
  frontend: [
    'react', 'next.js', 'vue', 'vue.js', 'nuxt', 'angular', 'svelte', 'sveltekit',
    'tailwind', 'tailwind css', 'redux', 'zustand', 'mobx', 'webpack', 'vite', 'base ui',
    'radix ui', 'shadcn', 'material ui', 'bootstrap', 'webgl', 'three.js', 'websockets',
  ],
  backend: [
    'node.js', 'express', 'nestjs', 'fastapi', 'flask', 'django', 'spring boot',
    'asp.net', 'ruby on rails', 'gin', 'fiber', 'gRPC', 'rest api', 'graphql', 'microservices',
    'event-driven architecture', 'apollo', 'trpc', 'socket.io',
  ],
  databases: [
    'postgresql', 'postgres', 'mysql', 'sqlite', 'mongodb', 'redis', 'cassandra',
    'dynamodb', 'elasticsearch', 'neo4j', 'snowflake', 'bigquery', 'prisma', 'typeorm',
    'drizzle', 'pgvector', 'pinecone', 'milvus', 'weaviate',
  ],
  devops_cloud: [
    'docker', 'kubernetes', 'k8s', 'aws', 'amazon web services', 'gcp', 'google cloud',
    'azure', 'terraform', 'ansible', 'helm', 'ci/cd', 'github actions', 'gitlab ci',
    'jenkins', 'linux', 'nginx', 'prometheus', 'grafana', 'datadog', 'cloudwatch',
  ],
  aiml: [
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn',
    'keras', 'pandas', 'numpy', 'hugging face', 'langchain', 'llamaindex', 'rag',
    'computer vision', 'nlp', 'natural language processing', 'transformers', 'llms',
    'embeddings', 'fine-tuning', 'openai',
  ],
  architecture_concepts: [
    'system design', 'distributed systems', 'data structures', 'algorithms',
    'object-oriented programming', 'oop', 'test-driven development', 'tdd', 'clean architecture',
    'high availability', 'scalability', 'concurrency', 'multithreading', 'caching',
    'load balancing', 'message queues', 'kafka', 'rabbitmq', 'sqs',
  ],
};

const ALL_SKILLS_FLAT: string[] = Object.values(COMPREHENSIVE_SKILL_TAXONOMY).flat();

const SECTION_HEADERS_MAP: Record<string, string[]> = {
  summary: ['summary', 'professional summary', 'executive summary', 'about me', 'profile', 'objective'],
  experience: ['experience', 'work experience', 'professional experience', 'employment history', 'work history'],
  education: ['education', 'academic background', 'academic history', 'degrees'],
  skills: ['skills', 'technical skills', 'core competencies', 'skills & tools', 'technologies', 'proficiencies'],
  projects: ['projects', 'personal projects', 'key projects', 'academic projects', 'portfolio'],
  certifications: ['certifications', 'licenses', 'certificates', 'accreditations'],
  achievements: ['achievements', 'honors', 'awards', 'publications'],
};

const STRONG_ACTION_VERBS = new Set([
  'architected', 'engineered', 'spearheaded', 'designed', 'developed', 'optimized',
  'streamlined', 'deployed', 'implemented', 'scaled', 'accelerated', 'automated',
  'reduced', 'increased', 'maximized', 'eliminated', 'overhauled', 'boosted',
  'authored', 'orchestrated', 'pioneered', 'championed', 'transformed', 'delivered',
]);

const WEAK_PASSIVE_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'assisted in', 'handled',
  'participated in', 'tasked with', 'involved in', 'supported', 'did',
];

export interface LineFeedback {
  lineIndex: number;
  originalText: string;
  issue: string;
  severity: 'warning' | 'error' | 'tip';
  suggestedRewrite: string;
}

export interface DeterministicBreakdown {
  sectionsScore: number;
  keywordScore: number;
  formattingScore: number;
  impactScore: number;
  technicalDepthScore: number;
  readabilityScore: number;
  sections: Record<string, boolean>;
  extractedSkills: string[];
  categorizedSkills: Record<string, string[]>;
  missingSkills: string[];
  missingKeywords: string[];
  weakBullets: Array<{ text: string; reason: string; rewrite: string }>;
  lineFeedback: LineFeedback[];
  rewrittenResume: string;
  overallScore: number;
}

export function normalizeText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function detectSections(text: string): Record<string, boolean> {
  const lower = text.toLowerCase();
  const detected: Record<string, boolean> = {};

  for (const [sectionKey, aliases] of Object.entries(SECTION_HEADERS_MAP)) {
    detected[sectionKey] = aliases.some((alias) => {
      const regex = new RegExp(`(^|\\n)[\\s#*_-]*${alias}[:\\s]*($|\\n)`, 'i');
      return regex.test(lower) || lower.includes(alias);
    });
  }
  return detected;
}

export function extractSkills(text: string): {
  skills: string[];
  categorized: Record<string, string[]>;
} {
  const lower = ' ' + text.toLowerCase().replace(/[^a-z0-9+#.-]/g, ' ') + ' ';
  const matched = new Set<string>();
  const categorized: Record<string, string[]> = {};

  for (const [category, skills] of Object.entries(COMPREHENSIVE_SKILL_TAXONOMY)) {
    categorized[category] = [];
    for (const skill of skills) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<=[\\s,;()/\\[\\]]|^)${escaped}(?=[\\s,;()/\\[\\]]|$)`, 'i');
      if (regex.test(lower)) {
        matched.add(skill);
        categorized[category].push(skill);
      }
    }
  }

  return { skills: Array.from(matched), categorized };
}

export function extractBulletPoints(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];

  for (const line of lines) {
    if (/^[-•*▪–—]\s*/.test(line)) {
      bullets.push(line.replace(/^[-•*▪–—]\s*/, '').trim());
    } else if (line.length > 30 && !line.endsWith(':') && !line.startsWith('#')) {
      bullets.push(line);
    }
  }
  return bullets;
}

export function scoreImpactAndWeakBullets(bullets: string[]): {
  impactScore: number;
  weakBullets: Array<{ text: string; reason: string; rewrite: string }>;
  lineFeedback: LineFeedback[];
} {
  if (bullets.length === 0) {
    return {
      impactScore: 0.2,
      weakBullets: [],
      lineFeedback: [],
    };
  }

  const metricRegex = /\b(\d+(\.\d+)?%?|\$\d+(\.\d+)?[kmb]?|\d+[kmb]|\d+\s*(ms|seconds|minutes|hours|days|x|users|qps|requests|tps|million|billion))\b/i;

  let strongBulletCount = 0;
  const weakBullets: Array<{ text: string; reason: string; rewrite: string }> = [];
  const lineFeedback: LineFeedback[] = [];

  bullets.forEach((bullet, index) => {
    const lower = bullet.toLowerCase();
    const firstWord = lower.split(/\s+/)[0] || '';
    const hasMetric = metricRegex.test(bullet);
    const hasStrongVerb = STRONG_ACTION_VERBS.has(firstWord);
    const passivePhrase = WEAK_PASSIVE_PHRASES.find((p) => lower.startsWith(p) || lower.includes(p));

    let isWeak = false;
    let reason = '';
    let rewrite = bullet;

    if (passivePhrase) {
      isWeak = true;
      reason = `Starts with passive phrase "${passivePhrase}". Use an active impact verb (e.g. "Architected", "Engineered", "Optimized").`;
      rewrite = `Engineered and deployed scalable solution, improving throughput and reliability by 25%.`;
    } else if (!hasMetric && bullet.length > 30) {
      isWeak = true;
      reason = `Lacks measurable impact metrics (%, $, latency, or scale). Apply Google's XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]".`;
      rewrite = `${bullet.replace(/\.$/, '')}, resulting in a 30% reduction in turnaround time.`;
    } else if (bullet.length < 35) {
      isWeak = true;
      reason = `Too brief to convey scope and engineering complexity. Elaborate on tech stack and outcomes.`;
      rewrite = `Spearheaded end-to-end development of feature using modern microservices, increasing user engagement by 18%.`;
    } else if (!hasStrongVerb) {
      reason = `Consider beginning with a high-impact action verb to make accomplishments punchier.`;
    }

    if (!isWeak && hasMetric && hasStrongVerb) {
      strongBulletCount++;
    } else if (hasMetric || hasStrongVerb) {
      strongBulletCount += 0.5;
    }

    if (isWeak) {
      weakBullets.push({ text: bullet, reason, rewrite });
      lineFeedback.push({
        lineIndex: index + 1,
        originalText: bullet,
        issue: reason,
        severity: passivePhrase ? 'error' : 'warning',
        suggestedRewrite: rewrite,
      });
    }
  });

  const rawScore = strongBulletCount / Math.max(bullets.length, 1);
  const impactScore = Math.min(1, Math.max(0.2, Math.round(rawScore * 100) / 100));

  return { impactScore, weakBullets, lineFeedback };
}

export function scoreTechnicalDepth(categorized: Record<string, string[]>): number {
  let score = 0;
  if ((categorized.languages?.length || 0) >= 2) score += 20;
  if ((categorized.frontend?.length || 0) >= 1) score += 15;
  if ((categorized.backend?.length || 0) >= 1) score += 15;
  if ((categorized.databases?.length || 0) >= 1) score += 15;
  if ((categorized.devops_cloud?.length || 0) >= 1) score += 20;
  if ((categorized.architecture_concepts?.length || 0) >= 1) score += 15;

  return Math.min(100, score);
}

export function scoreFormattingAndReadability(text: string, bullets: string[]): {
  formattingScore: number;
  readabilityScore: number;
} {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let formattingScore = 80;
  if (wordCount >= 350 && wordCount <= 750) formattingScore += 15;
  else if (wordCount < 200 || wordCount > 1100) formattingScore -= 20;

  if (bullets.length >= 4) {
    const avgLen = bullets.reduce((sum, b) => sum + b.length, 0) / bullets.length;
    if (avgLen >= 50 && avgLen <= 180) formattingScore += 5;
    else formattingScore -= 10;
  }

  let readabilityScore = 85;
  const sentenceCount = text.split(/[.!?]+/).filter(Boolean).length;
  const avgSentenceWords = sentenceCount > 0 ? wordCount / sentenceCount : 15;
  if (avgSentenceWords > 25) readabilityScore -= 15;
  if (bullets.length < 3) readabilityScore -= 20;

  return {
    formattingScore: Math.min(100, Math.max(30, formattingScore)),
    readabilityScore: Math.min(100, Math.max(30, readabilityScore)),
  };
}

export function generateRewrittenResume(
  text: string,
  sections: Record<string, boolean>,
  extractedSkills: string[],
  weakBullets: Array<{ text: string; reason: string; rewrite: string }>,
): string {
  let upgraded = text;

  for (const weak of weakBullets) {
    if (upgraded.includes(weak.text)) {
      upgraded = upgraded.replace(weak.text, `• ${weak.rewrite}`);
    }
  }

  return upgraded;
}

export function computeDeterministicBreakdown(text: string): DeterministicBreakdown {
  const sections = detectSections(text);
  const sectionsPresent = Object.values(sections).filter(Boolean).length;
  const sectionsScore = Math.round((sectionsPresent / Object.keys(SECTION_HEADERS_MAP).length) * 100) / 100;

  const { skills: extractedSkills, categorized: categorizedSkills } = extractSkills(text);
  const keywordScore = Math.min(100, Math.round((extractedSkills.length / 12) * 100));

  const bullets = extractBulletPoints(text);
  const { impactScore, weakBullets, lineFeedback } = scoreImpactAndWeakBullets(bullets);

  const technicalDepthScore = scoreTechnicalDepth(categorizedSkills);
  const { formattingScore, readabilityScore } = scoreFormattingAndReadability(text, bullets);

  const essentialKeywords = ['CI/CD', 'Docker', 'Testing', 'System Design', 'Cloud', 'Git', 'Agile'];
  const missingKeywords = essentialKeywords.filter(
    (kw) => !text.toLowerCase().includes(kw.toLowerCase()),
  );

  const missingSkills = ['System Design', 'Distributed Systems', 'Docker', 'PostgreSQL', 'Redis'].filter(
    (s) => !extractedSkills.some((es) => es.toLowerCase() === s.toLowerCase()),
  );

  const rewrittenResume = generateRewrittenResume(text, sections, extractedSkills, weakBullets);

  const overallScore = Math.round(
    sectionsScore * 20 +
    (keywordScore / 100) * 20 +
    impactScore * 25 +
    (technicalDepthScore / 100) * 15 +
    (formattingScore / 100) * 10 +
    (readabilityScore / 100) * 10,
  );

  return {
    sectionsScore,
    keywordScore,
    formattingScore,
    impactScore: Math.round(impactScore * 100),
    technicalDepthScore,
    readabilityScore,
    sections,
    extractedSkills,
    categorizedSkills,
    missingSkills,
    missingKeywords,
    weakBullets,
    lineFeedback,
    rewrittenResume,
    overallScore,
  };
}

export function overallScoreFromBreakdown(b: DeterministicBreakdown): number {
  return b.overallScore;
}
