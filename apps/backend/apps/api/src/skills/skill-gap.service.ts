import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, SkillImportance } from '@career-lens/db';
import { SkillGraphService } from './skill-graph.service';

export interface ComputedGap {
  skillId: string;
  skillName: string;
  priority: number;
  difficulty: number;
  prerequisitesMet: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  estimatedHours: number;
  downstreamUnlocked: number;
}

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

    const missing = roleSkills.filter((rs) => !ownedSkillIds.has(rs.skillId));

    const results: ComputedGap[] = [];
    for (const rs of missing) {
      const prerequisites = await this.graph.prerequisitesOf(rs.skillId);
      const prerequisitesMet = prerequisites.every((p) => ownedSkillIds.has(p));

      // Calculate real downstream unlock impact
      const downstreamCount = await this.graph.countDependants(rs.skillId);
      const unlocksCount = downstreamCount * 15;

      const basePriority = rs.importance === SkillImportance.REQUIRED ? 100 : 25;
      const priority = basePriority + (prerequisitesMet ? 10 : 0) + unlocksCount;
      const difficulty = Math.min(5, prerequisites.length + 1);

      const severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
        rs.importance === SkillImportance.REQUIRED && downstreamCount > 0
          ? 'CRITICAL'
          : rs.importance === SkillImportance.REQUIRED
          ? 'HIGH'
          : 'MEDIUM';

      const estimatedHours = difficulty * 8; // ~8 hours per difficulty tier

      results.push({
        skillId: rs.skillId,
        skillName: rs.skill.name,
        priority,
        difficulty,
        prerequisitesMet,
        severity,
        estimatedHours,
        downstreamUnlocked: downstreamCount,
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
