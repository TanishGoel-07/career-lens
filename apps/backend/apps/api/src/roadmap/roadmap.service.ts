import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, RoadmapModuleType } from '@career-lens/db';
import { SkillGraphService } from '../skills/skill-graph.service';

/**
 * Roadmap generation is a deterministic topological sort over the
 * prerequisite graph, sliced into modules by time budget. AI is not
 * involved in sequencing (architecture §11) — a documented future
 * enhancement is using AI only to fill in resource links/descriptions
 * per module, which is intentionally NOT wired up yet in this v1 pass
 * so the ordering logic can be tested and trusted in isolation first.
 */
@Injectable()
export class RoadmapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: SkillGraphService,
  ) {}

  async generate(userId: string, targetRoleId: string, hoursPerWeek: number): Promise<any> {
    const targetRole = await this.prisma.targetRole.findUnique({ where: { id: targetRoleId } });
    if (!targetRole || targetRole.userId !== userId) {
      throw new NotFoundException('Target role not found.');
    }

    const gaps = await this.prisma.skillGap.findMany({
      where: { userId, targetRoleId },
      include: { skill: true },
      orderBy: { priority: 'desc' },
    });
    if (gaps.length === 0) {
      throw new NotFoundException('No computed skill gaps for this role — run gap analysis first.');
    }

    // Topological ordering: for each gap (already priority-sorted),
    // insert any not-yet-owned prerequisites immediately before it.
    const seen = new Set<string>();
    const ordered: { skillId: string; title: string }[] = [];

    for (const gap of gaps) {
      const prereqs = await this.graph.prerequisitesOf(gap.skillId);
      for (const prereqId of prereqs) {
        if (!seen.has(prereqId)) {
          const skill = await this.prisma.skill.findUnique({ where: { id: prereqId } });
          if (skill) {
            ordered.push({ skillId: prereqId, title: skill.name });
            seen.add(prereqId);
          }
        }
      }
      if (!seen.has(gap.skillId)) {
        ordered.push({ skillId: gap.skillId, title: gap.skill.name });
        seen.add(gap.skillId);
      }
    }

    const roadmap = await this.prisma.roadmap.create({
      data: {
        userId,
        targetRoleId,
        generatedFrom: { hoursPerWeek, gapCount: gaps.length },
      },
    });

    // Each skill becomes: MODULE -> PRACTICE -> PROJECT, with an
    // ASSESSMENT every 3 skills — a fixed, explainable template rather
    // than an AI-invented structure.
    let orderIndex = 0;
    const moduleRows: {
      roadmapId: string;
      skillGapId: string | null;
      title: string;
      type: RoadmapModuleType;
      orderIndex: number;
    }[] = [];

    ordered.forEach((skill, i) => {
      const matchingGap = gaps.find((g) => g.skillId === skill.skillId);
      moduleRows.push({
        roadmapId: roadmap.id,
        skillGapId: matchingGap?.id ?? null,
        title: `Learn: ${skill.title}`,
        type: RoadmapModuleType.MODULE,
        orderIndex: orderIndex++,
      });
      moduleRows.push({
        roadmapId: roadmap.id,
        skillGapId: matchingGap?.id ?? null,
        title: `Practice: ${skill.title}`,
        type: RoadmapModuleType.PRACTICE,
        orderIndex: orderIndex++,
      });
      if ((i + 1) % 3 === 0) {
        moduleRows.push({
          roadmapId: roadmap.id,
          skillGapId: null,
          title: `Assessment: checkpoint ${Math.ceil((i + 1) / 3)}`,
          type: RoadmapModuleType.ASSESSMENT,
          orderIndex: orderIndex++,
        });
      }
    });
    moduleRows.push({
      roadmapId: roadmap.id,
      skillGapId: null,
      title: `Capstone project for ${targetRole.title}`,
      type: RoadmapModuleType.PROJECT,
      orderIndex: orderIndex++,
    });

    await this.prisma.roadmapModule.createMany({ data: moduleRows });
    return this.prisma.roadmap.findUnique({
      where: { id: roadmap.id },
      include: { modules: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async updateModuleStatus(userId: string, moduleId: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'): Promise<any> {
    const mod = await this.prisma.roadmapModule.findUnique({
      where: { id: moduleId },
      include: { roadmap: true },
    });
    if (!mod || mod.roadmap.userId !== userId) throw new NotFoundException('Roadmap module not found.');

    return this.prisma.roadmapModule.update({
      where: { id: moduleId },
      data: { status, completedAt: status === 'COMPLETED' ? new Date() : null },
    });
  }
}
