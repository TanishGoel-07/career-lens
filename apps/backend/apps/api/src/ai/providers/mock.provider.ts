import { Injectable } from '@nestjs/common';
import { AiCompletionRequest, AiCompletionResult, AiProvider } from './ai-provider.interface';

/**
 * Data-driven fallback AI provider for tests and offline development.
 * It parses the input variables and generates dynamic, grounded responses
 * strictly from the caller's context rather than static canned strings.
 */
@Injectable()
export class MockProvider implements AiProvider {
  readonly name = 'mock';

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    let vars: Record<string, any> = {};
    try {
      vars = JSON.parse(req.userPrompt);
    } catch {
      vars = {};
    }

    let text: string;

    if (req.systemPrompt.includes('resume-feedback')) {
      const skills: string[] = Array.isArray(vars.extractedSkills)
        ? vars.extractedSkills
        : (vars.detectedSkills || ['Software Engineering']);
      const missing: string[] = Array.isArray(vars.missingSkills)
        ? vars.missingSkills
        : (vars.missingTargetSkills || ['System Design', 'Cloud Architecture']);
      const weakBullets: any[] = vars.flaggedWeakBullets || [];

      text = JSON.stringify({
        strengths: [
          `Demonstrated proficiency in ${skills.slice(0, 3).join(', ')} aligns well with technical requirements.`,
          `Effective structural presentation of experience and education sections.`,
        ],
        weaknesses: weakBullets.length > 0
          ? [
              `Found ${weakBullets.length} bullet point(s) lacking quantifiable metrics (%, $, latency) or action verbs.`,
              `Bullet "${(weakBullets[0].text || '').slice(0, 60)}..." could be significantly strengthened.`,
            ]
          : [`Could incorporate higher density of senior architectural keywords.`],
        suggestions: [
          weakBullets[0]?.rewrite
            ? `Rewrite weak bullet to: "${weakBullets[0].rewrite.slice(0, 100)}"`
            : `Add quantifiable metrics (e.g. reduced latency by 35%, scaled to 100k users) to each bullet.`,
          `Build hands-on portfolio proof of work targeting ${missing.slice(0, 2).join(' and ')}.`,
        ],
      });
    } else if (req.systemPrompt.includes('match-explanation') || req.systemPrompt.includes('job-match-explanation')) {
      const matching: string[] = vars.matchingSkills || [];
      const missingReq: string[] = vars.missingRequired || [];
      const score = vars.overallScore ?? 75;

      const summary = matching.length > 0
        ? `You align well on core required skills including ${matching.slice(0, 4).join(', ')}.`
        : `Baseline qualifications observed.`;

      const gapSummary = missingReq.length > 0
        ? ` To reach a higher interview conversion probability, bridge gaps in ${missingReq.slice(0, 3).join(', ')}.`
        : ` Profile satisfies all hard requirements.`;

      text = JSON.stringify({
        explanation: `Calculated match score of ${score}%. ${summary}${gapSummary}`,
      });
    } else if (req.systemPrompt.includes('career-coach')) {
      const userMsg: string = (vars.message || '').toLowerCase();
      const profile = vars.context?.profileSummary;
      const gaps = vars.context?.topSkillGaps || [];
      const resumeScore = vars.context?.resumeSummary?.overallScore ?? 78;

      let reply = '';
      if (userMsg.includes('google') || userMsg.includes('internship') || userMsg.includes('sde')) {
        reply = `For a high-tier SDE role at Google, here is your personalized readiness breakdown:\n` +
          `• Current Profile Score: ${resumeScore}/100\n` +
          `• Priority Skill Gaps: ${gaps.slice(0, 3).map((g: any) => g.skill).join(', ') || 'System Design, Concurrency, Distributed Caching'}\n` +
          `• DSA Readiness: Focus on Graph Traversal (BFS/DFS), Dynamic Programming, and Heap optimizations.\n` +
          `• 6-Week Action Plan: Dedicate Weeks 1-2 to core DSA patterns, Weeks 3-4 to low-level system design (concurrency & rate limiting), and Weeks 5-6 to mock technical interviews.`;
      } else if (userMsg.includes('resume') || userMsg.includes('optimize')) {
        reply = `Based on your latest resume evaluation (${resumeScore}/100), the highest leverage improvements are:\n` +
          `1. Quantify all accomplishments with measurable business outcomes (latency, user scale, cost efficiency).\n` +
          `2. Group technical proficiencies into distinct categories.\n` +
          `3. Directly target the primary skills listed in your desired job matches.`;
      } else {
        reply = `Reviewing your career progress: your active roadmap has targeted milestones ready. Focus on addressing your top priority skill gap (${gaps[0]?.skill || 'Core Architecture'}) to unlock maximum job match potential.`;
      }

      text = JSON.stringify({ text: reply });
    } else {
      text = JSON.stringify({ text: 'Dynamic AI response synthesized from verified context.' });
    }

    return {
      text,
      inputTokens: Math.ceil((req.systemPrompt.length + req.userPrompt.length) / 4),
      outputTokens: Math.ceil(text.length / 4),
      model: 'data-driven-mock',
    };
  }
}
