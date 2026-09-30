import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, RoadmapModuleType } from '@career-lens/db';
import { SkillGraphService } from '../skills/skill-graph.service';

const RESOURCE_CATALOG: Record<
  string,
  {
    docs: string[];
    tasks: string[];
    project: string;
  }
> = {
  postgresql: {
    docs: ['https://www.postgresql.org/docs/current/tutorial.html', 'https://use-the-index-luke.com/'],
    tasks: [
      'Write multi-table relational queries with EXPLAIN ANALYZE',
      'Benchmark B-Tree index scan vs sequential scan on 500k rows',
      'Implement ACID transactions with serializable isolation',
    ],
    project: 'Design normalized database schema with partitioning, foreign keys, and audit logging',
  },
  transactions: {
    docs: ['https://www.postgresql.org/docs/current/transaction-iso.html'],
    tasks: [
      'Simulate concurrent bank account transfers and prevent deadlocks',
      'Test Read Committed vs Repeatable Read under race conditions',
    ],
    project: 'Build transactional ledger API with idempotency keys and rollback safety',
  },
  indexing: {
    docs: ['https://use-the-index-luke.com/sql/where-clause/the-index-leaf-nodes'],
    tasks: [
      'Create partial and composite indexes for common search filters',
      'Optimize slow query from 1200ms to under 15ms',
    ],
    project: 'Index tuning report with cost-based query plan optimizations',
  },
  'system design': {
    docs: ['https://github.com/donnemartin/system-design-primer'],
    tasks: [
      'Design distributed rate limiter with Redis sliding window',
      'Calculate bandwidth, storage, and throughput for 10M DAU service',
    ],
    project: 'Architect end-to-end distributed URL shortener or message streaming pipeline',
  },
  caching: {
    docs: ['https://redis.io/docs/manual/patterns/distributed-locks/'],
    tasks: [
      'Implement cache-aside and write-through patterns',
      'Configure Redis TTL, eviction policies (LRU/LFU), and stampede protection',
    ],
    project: 'Build high-speed multi-tier caching layer with Redis and local in-memory fallback',
  },
  redis: {
    docs: ['https://redis.io/commands/'],
    tasks: [
      'Use Redis Hashes, Sets, and Sorted Sets for real-time leaderboard',
      'Implement pub/sub event broadcasting with backpressure',
    ],
    project: 'Real-time collaborative presence system backed by Redis Streams',
  },
  'distributed systems': {
    docs: ['https://martinfowler.com/articles/patterns-of-distributed-systems/'],
    tasks: [
      'Demonstrate CAP theorem tradeoffs in partitioned state machines',
      'Implement two-phase commit (2PC) or SAGA distributed workflow',
    ],
    project: 'Fault-tolerant distributed task scheduler with worker heartbeats and consensus',
  },
  docker: {
    docs: ['https://docs.docker.com/get-started/'],
    tasks: [
      'Write multi-stage Dockerfile optimizing image size from 1.2GB to 80MB',
      'Configure non-root user execution, read-only rootfs, and dropped capabilities',
    ],
    project: 'Containerize multi-service application with Docker Compose and healthchecks',
  },
  typescript: {
    docs: ['https://www.typescriptlang.org/docs/handbook/intro.html'],
    tasks: [
      'Use advanced generics, conditional types, and template literal types',
      'Define strict Zod runtime schemas matching compile-time types',
    ],
    project: 'Type-safe SDK client with automatic retries and request/response interceptors',
  },
};

@Injectable()
export class RoadmapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: SkillGraphService,
  ) {}

  private getCuratedResources(skillName: string): { docs: string[]; tasks: string[]; project: string } {
    const key = skillName.toLowerCase();
    for (const [catalogKey, data] of Object.entries(RESOURCE_CATALOG)) {
      if (key.includes(catalogKey)) return data;
    }
    return {
      docs: [`https://devdocs.io/#q=${encodeURIComponent(skillName)}`],
      tasks: [
        `Implement foundational proof of concept utilizing ${skillName}`,
        `Benchmark performance and write comprehensive unit tests for ${skillName}`,
      ],
      project: `Build production-ready service module demonstrating mastery of ${skillName}`,
    };
  }

  async generate(userId: string, targetRoleId: string, hoursPerWeek = 10): Promise<any> {
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

    // Topological ordering: prerequisites ordered before dependants
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

    let orderIndex = 0;
    let currentWeek = 1;
    const moduleRows: {
      roadmapId: string;
      skillGapId: string | null;
      title: string;
      type: RoadmapModuleType;
      orderIndex: number;
      resources: any;
    }[] = [];

    ordered.forEach((skill, i) => {
      const matchingGap = gaps.find((g) => g.skillId === skill.skillId);
      const curated = this.getCuratedResources(skill.title);

      // Deep Theory & Architecture Module
      moduleRows.push({
        roadmapId: roadmap.id,
        skillGapId: matchingGap?.id ?? null,
        title: `Week ${currentWeek}: Architecture & Theory — ${skill.title}`,
        type: RoadmapModuleType.MODULE,
        orderIndex: orderIndex++,
        resources: {
          week: currentWeek,
          hoursEstimate: Math.max(3, Math.round(hoursPerWeek * 0.4)),
          documentation: curated.docs,
          keyObjectives: [`Understand internal mechanics of ${skill.title}`, 'Analyze trade-offs and design patterns'],
        },
      });

      // Hands-on Practical Lab Module
      moduleRows.push({
        roadmapId: roadmap.id,
        skillGapId: matchingGap?.id ?? null,
        title: `Week ${currentWeek}: Hands-on Lab & Implementation — ${skill.title}`,
        type: RoadmapModuleType.PRACTICE,
        orderIndex: orderIndex++,
        resources: {
          week: currentWeek,
          hoursEstimate: Math.max(4, Math.round(hoursPerWeek * 0.5)),
          tasks: curated.tasks,
          deliverable: curated.project,
        },
      });

      // Assessment checkpoint every 2 skills
      if ((i + 1) % 2 === 0) {
        currentWeek++;
        moduleRows.push({
          roadmapId: roadmap.id,
          skillGapId: null,
          title: `Week ${currentWeek}: Milestone Evaluation & Code Review checkpoint ${Math.ceil((i + 1) / 2)}`,
          type: RoadmapModuleType.ASSESSMENT,
          orderIndex: orderIndex++,
          resources: {
            week: currentWeek,
            hoursEstimate: Math.max(2, Math.round(hoursPerWeek * 0.3)),
            tasks: [
              'Complete mock technical assessment on tested concepts',
              'Submit code for automated sandbox verification',
            ],
          },
        });
      }

      currentWeek++;
    });

    // Capstone Project Module
    moduleRows.push({
      roadmapId: roadmap.id,
      skillGapId: null,
      title: `Final Capstone: Portfolio Architecture for ${targetRole.title}`,
      type: RoadmapModuleType.PROJECT,
      orderIndex: orderIndex++,
      resources: {
        week: currentWeek,
        hoursEstimate: hoursPerWeek * 2,
        tasks: [
          'Design distributed microservice or full-stack solution integrating all mastered skills',
          'Deploy containerized project to cloud with CI/CD and metrics dashboard',
          'Document architectural decisions (ADRs) and add to GitHub portfolio',
        ],
      },
    });

    await this.prisma.roadmapModule.createMany({ data: moduleRows });

    return this.prisma.roadmap.findUnique({
      where: { id: roadmap.id },
      include: {
        targetRole: true,
        modules: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async listUserRoadmaps(userId: string): Promise<any[]> {
    return this.prisma.roadmap.findMany({
      where: { userId },
      include: {
        targetRole: true,
        modules: { orderBy: { orderIndex: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateModuleStatus(
    userId: string,
    moduleId: string,
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
  ): Promise<any> {
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
