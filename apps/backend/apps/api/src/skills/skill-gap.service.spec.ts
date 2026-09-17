import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SkillGapService } from './skill-gap.service';
import { SkillGraphService } from './skill-graph.service';
import { PrismaService, SkillImportance } from '@career-lens/db';

describe('SkillGapService', () => {
  let service: SkillGapService;
  let prisma: {
    targetRole: { findUnique: jest.Mock };
    roleSkill: { findMany: jest.Mock };
    userSkill: { findMany: jest.Mock };
    skillGap: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let graph: {
    prerequisitesOf: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      targetRole: { findUnique: jest.fn() },
      roleSkill: { findMany: jest.fn() },
      userSkill: { findMany: jest.fn() },
      skillGap: { upsert: jest.fn() },
      $transaction: jest.fn().mockImplementation((arr) => Promise.all(arr)),
    };
    graph = {
      prerequisitesOf: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillGapService,
        { provide: PrismaService, useValue: prisma },
        { provide: SkillGraphService, useValue: graph },
      ],
    }).compile();

    service = module.get<SkillGapService>(SkillGapService);
  });

  it('should throw NotFoundException if target role not found or not owned by user', async () => {
    prisma.targetRole.findUnique.mockResolvedValue(null);

    await expect(service.computeForUser('user-1', 'role-1')).rejects.toThrow(NotFoundException);
  });

  it('should identify missing skills, check prerequisites, and calculate priorities deterministically', async () => {
    prisma.targetRole.findUnique.mockResolvedValue({
      id: 'role-1',
      userId: 'user-1',
      title: 'Backend Engineer',
    });

    // Target role requires TypeScript (owned), Docker (missing, prereqs met), and Kubernetes (missing, Docker is prereq)
    prisma.roleSkill.findMany.mockResolvedValue([
      {
        skillId: 'sk-ts',
        importance: SkillImportance.REQUIRED,
        skill: { name: 'TypeScript' },
      },
      {
        skillId: 'sk-docker',
        importance: SkillImportance.REQUIRED,
        skill: { name: 'Docker' },
      },
      {
        skillId: 'sk-k8s',
        importance: SkillImportance.REQUIRED,
        skill: { name: 'Kubernetes' },
      },
      {
        skillId: 'sk-graphql',
        importance: SkillImportance.OPTIONAL,
        skill: { name: 'GraphQL' },
      },
    ]);

    // User already has TypeScript
    prisma.userSkill.findMany.mockResolvedValue([{ skillId: 'sk-ts' }]);

    // Docker has no prereqs
    graph.prerequisitesOf.mockImplementation((skillId: string) => {
      if (skillId === 'sk-docker') return Promise.resolve([]);
      if (skillId === 'sk-k8s') return Promise.resolve(['sk-docker']);
      if (skillId === 'sk-graphql') return Promise.resolve(['sk-ts']);
      return Promise.resolve([]);
    });

    const gaps = await service.computeForUser('user-1', 'role-1');

    expect(gaps.length).toBe(3); // Docker, Kubernetes, GraphQL

    const dockerGap = gaps.find((g) => g.skillId === 'sk-docker');
    expect(dockerGap).toBeDefined();
    expect(dockerGap?.prerequisitesMet).toBe(true);
    expect(dockerGap?.priority).toBe(105); // 100 base + 5 (prereqs met)

    const k8sGap = gaps.find((g) => g.skillId === 'sk-k8s');
    expect(k8sGap).toBeDefined();
    expect(k8sGap?.prerequisitesMet).toBe(false); // Docker not owned
    expect(k8sGap?.priority).toBe(100); // 100 base + 0

    const graphqlGap = gaps.find((g) => g.skillId === 'sk-graphql');
    expect(graphqlGap).toBeDefined();
    expect(graphqlGap?.prerequisitesMet).toBe(true); // TypeScript owned
    expect(graphqlGap?.priority).toBe(15); // 10 base (OPTIONAL) + 5

    // Result should be sorted by priority descending: Docker (105) -> K8s (100) -> GraphQL (15)
    expect(gaps[0].skillId).toBe('sk-docker');
    expect(gaps[1].skillId).toBe('sk-k8s');
    expect(gaps[2].skillId).toBe('sk-graphql');

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
