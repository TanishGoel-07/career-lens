import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, SkillImportance } from '@career-lens/db';
import { SkillGraphService } from './skill-graph.service';

export interface ComputedGap {
  skillId: string;
  skillName: string;
  priority: number;
  difficulty: number;
  prerequisitesMet: boolean;
}

/**
 * Deterministic gap computation (architecture §10):
 *   1. Diff RoleSkill (required for the target role) against UserSkill.
 *   2. For each missing skill, check whether its prerequisites are
 *      already satisfied.
 *   3. Priority = required skills first, then weighted by how many
 *      other required role-skills depend on it (a rough "unlocks the
 *      most things next" heuristic) — no AI judgment involved.
 *
 * `difficulty` is a curated, static per-skill attribute (Skill.category
 * is used as a coarse proxy here; a dedicated difficulty column is a
 * documented follow-up rather than something inferred by AI).
 */
@Injectable()
export class SkillGapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: SkillGraphService,
  ) {}

  async computeForUser(userId: string, targetRoleId: string): Promise<ComputedGap[]> {
    const targetRole = await this.prisma.targetRole.findUnique({ where: { id: targetRoleId } });
    if (!targetRole || targetRole.userId !== userId) {
      throw new NotFoundException('Target role not found.');
    }

    const [roleSkills, userSkills] = await Promise.all([
      this.prisma.roleSkill.findMany({ where: { roleId: targetRoleId }, include: { skill: true } }),
      this.prisma.userSkill.findMany({ where: { userId } }),
    ]);

    const ownedSkillIds = new Set(userSkills.map((s) => s.skillId));
    const requiredSkillIds = new Set(
      roleSkills.filter((rs) => rs.importance === SkillImportance.REQUIRED).map((rs) => rs.skillId),
    );

    const missing = roleSkills.filter((rs) => !ownedSkillIds.has(rs.skillId));

    const results: ComputedGap[] = [];
    for (const rs of missing) {
      const prerequisites = await this.graph.prerequisitesOf(rs.skillId);
      const prerequisitesMet = prerequisites.every((p) => ownedSkillIds.has(p));

      // "Unlocks the most things next" weighting is a documented v1
      // placeholder (kept at 0, not fabricated) until a real
      // downstream-dependency count query is added.
      const unlocksCount = 0;

      const basePriority = rs.importance === SkillImportance.REQUIRED ? 100 : 10;
      const priority = basePriority + (prerequisitesMet ? 5 : 0) + unlocksCount;
      const difficulty = prerequisites.length + 1; // more unmet prerequisites -> harder, deterministic proxy

      results.push({
        skillId: rs.skillId,
        skillName: rs.skill.name,
        priority,
        difficulty,
        prerequisitesMet,
      });
    }

    results.sort((a, b) => b.priority - a.priority);

    await this.prisma.$transaction(
      results.map((r) =>
        this.prisma.skillGap.upsert({
          where: { userId_targetRoleId_skillId: { userId, targetRoleId, skillId: r.skillId } },
          update: { priority: r.priority, difficulty: r.difficulty, prerequisitesMet: r.prerequisitesMet },
          create: {
            userId,
            targetRoleId,
            skillId: r.skillId,
            priority: r.priority,
            difficulty: r.difficulty,
            prerequisitesMet: r.prerequisitesMet,
          },
        }),
      ),
    );

    return results;
  }
}
