import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

/**
 * Owns the SkillDependency DAG: cycle-safe writes + traversal helpers
 * used by the gap engine and the roadmap engine. Pure deterministic
 * graph logic — no AI involved anywhere in this file (architecture §10).
 */
@Injectable()
export class SkillGraphService {
  constructor(private readonly prisma: PrismaService) {}

  /** Adds a prerequisite edge, rejecting it if it would create a cycle. */
  async addDependency(skillId: string, prerequisiteSkillId: string): Promise<void> {
    if (skillId === prerequisiteSkillId) {
      throw new BadRequestException('A skill cannot be its own prerequisite.');
    }

    const wouldCycle = await this.isReachable(prerequisiteSkillId, skillId);
    if (wouldCycle) {
      throw new BadRequestException(
        'Adding this dependency would create a cycle in the skill graph.',
      );
    }

    await this.prisma.skillDependency.upsert({
      where: { skillId_prerequisiteSkillId: { skillId, prerequisiteSkillId } },
      update: {},
      create: { skillId, prerequisiteSkillId },
    });
  }

  /** BFS: can `fromSkillId` reach `toSkillId` by following prerequisite edges? */
  private async isReachable(fromSkillId: string, toSkillId: string): Promise<boolean> {
    const visited = new Set<string>();
    let frontier = [fromSkillId];

    while (frontier.length > 0) {
      const edges = await this.prisma.skillDependency.findMany({
        where: { skillId: { in: frontier } },
        select: { prerequisiteSkillId: true },
      });
      const next: string[] = [];
      for (const edge of edges) {
        if (edge.prerequisiteSkillId === toSkillId) return true;
        if (!visited.has(edge.prerequisiteSkillId)) {
          visited.add(edge.prerequisiteSkillId);
          next.push(edge.prerequisiteSkillId);
        }
      }
      frontier = next;
    }
    return false;
  }

  /** All direct + transitive prerequisites of a skill, deepest-first. */
  async prerequisitesOf(skillId: string): Promise<string[]> {
    const ordered: string[] = [];
    const visited = new Set<string>();

    const visit = async (id: string) => {
      const edges = await this.prisma.skillDependency.findMany({
        where: { skillId: id },
        select: { prerequisiteSkillId: true },
      });
      for (const edge of edges) {
        if (!visited.has(edge.prerequisiteSkillId)) {
          visited.add(edge.prerequisiteSkillId);
          await visit(edge.prerequisiteSkillId);
          ordered.push(edge.prerequisiteSkillId);
        }
      }
    };
    await visit(skillId);
    return ordered; // topologically ordered: prerequisites before dependants
  }
}
