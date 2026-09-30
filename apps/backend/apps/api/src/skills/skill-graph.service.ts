import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

export interface SkillGraphNode {
  id: string;
  name: string;
  category: string | null;
  acquired?: boolean;
}

export interface SkillGraphEdge {
  fromSkillId: string;
  toSkillId: string;
}

export interface SkillGraphPayload {
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
}

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
    return ordered;
  }

  /** Count how many other skills have this skill as a direct or transitive prerequisite. */
  async countDependants(skillId: string): Promise<number> {
    const visited = new Set<string>();
    let frontier = [skillId];

    while (frontier.length > 0) {
      const edges = await this.prisma.skillDependency.findMany({
        where: { prerequisiteSkillId: { in: frontier } },
        select: { skillId: true },
      });
      const next: string[] = [];
      for (const edge of edges) {
        if (!visited.has(edge.skillId)) {
          visited.add(edge.skillId);
          next.push(edge.skillId);
        }
      }
      frontier = next;
    }
    return visited.size;
  }

  /** Returns full nodes and edges of the skill DAG for interactive visualization. */
  async getGraphVisualization(userId?: string): Promise<SkillGraphPayload> {
    const [allSkills, allEdges, userSkills] = await Promise.all([
      this.prisma.skill.findMany(),
      this.prisma.skillDependency.findMany(),
      userId ? this.prisma.userSkill.findMany({ where: { userId } }) : Promise.resolve([]),
    ]);

    const ownedSet = new Set(userSkills.map((us) => us.skillId));

    const nodes: SkillGraphNode[] = allSkills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      acquired: ownedSet.has(s.id),
    }));

    const edges: SkillGraphEdge[] = allEdges.map((e) => ({
      fromSkillId: e.prerequisiteSkillId,
      toSkillId: e.skillId,
    }));

    return { nodes, edges };
  }
}
