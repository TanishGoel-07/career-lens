import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoadmapService } from './roadmap.service';
import { SkillGraphService } from '../skills/skill-graph.service';
import { PrismaService } from '@career-lens/db';

describe('RoadmapService', () => {
  let service: RoadmapService;
  let prisma: {
    targetRole: { findUnique: jest.Mock };
    skillGap: { findMany: jest.Mock };
    skill: { findUnique: jest.Mock };
    roadmap: { create: jest.Mock; findUnique: jest.Mock };
    roadmapModule: { createMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let graph: {
    prerequisitesOf: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      targetRole: { findUnique: jest.fn() },
      skillGap: { findMany: jest.fn() },
      skill: { findUnique: jest.fn() },
      roadmap: { create: jest.fn(), findUnique: jest.fn() },
      roadmapModule: { createMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    graph = {
      prerequisitesOf: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadmapService,
        { provide: PrismaService, useValue: prisma },
        { provide: SkillGraphService, useValue: graph },
      ],
    }).compile();

    service = module.get<RoadmapService>(RoadmapService);
  });

  describe('generate', () => {
    it('should throw NotFoundException if role does not exist', async () => {
      prisma.targetRole.findUnique.mockResolvedValue(null);

      await expect(service.generate('u1', 'role-1', 10)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if no gaps computed yet', async () => {
      prisma.targetRole.findUnique.mockResolvedValue({ id: 'role-1', userId: 'u1' });
      prisma.skillGap.findMany.mockResolvedValue([]);

      await expect(service.generate('u1', 'role-1', 10)).rejects.toThrow(NotFoundException);
    });

    it('should topologically order prerequisites and generate modules', async () => {
      prisma.targetRole.findUnique.mockResolvedValue({
        id: 'role-1',
        userId: 'u1',
        title: 'Backend Engineer',
      });

      prisma.skillGap.findMany.mockResolvedValue([
        { id: 'gap-k8s', skillId: 'sk-k8s', skill: { name: 'Kubernetes' }, priority: 100 },
      ]);

      // Kubernetes has Docker as prereq
      graph.prerequisitesOf.mockResolvedValue(['sk-docker']);
      prisma.skill.findUnique.mockResolvedValue({ id: 'sk-docker', name: 'Docker' });

      prisma.roadmap.create.mockResolvedValue({ id: 'road-1', userId: 'u1' });
      prisma.roadmap.findUnique.mockResolvedValue({
        id: 'road-1',
        modules: [{ title: 'Learn: Docker' }, { title: 'Practice: Docker' }],
      });

      const result = await service.generate('u1', 'role-1', 10);

      expect(prisma.roadmapModule.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ title: 'Learn: Docker', orderIndex: 0 }),
            expect.objectContaining({ title: 'Practice: Docker', orderIndex: 1 }),
            expect.objectContaining({ title: 'Learn: Kubernetes' }),
            expect.objectContaining({ title: 'Practice: Kubernetes' }),
            expect.objectContaining({ title: expect.stringContaining('Capstone project') }),
          ]),
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateModuleStatus', () => {
    it('should throw NotFoundException if module not found or unauthorized', async () => {
      prisma.roadmapModule.findUnique.mockResolvedValue(null);

      await expect(service.updateModuleStatus('u1', 'mod-1', 'COMPLETED')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update module status and set completedAt on COMPLETED', async () => {
      prisma.roadmapModule.findUnique.mockResolvedValue({
        id: 'mod-1',
        roadmap: { userId: 'u1' },
      });
      prisma.roadmapModule.update.mockResolvedValue({
        id: 'mod-1',
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const updated = await service.updateModuleStatus('u1', 'mod-1', 'COMPLETED');

      expect(prisma.roadmapModule.update).toHaveBeenCalledWith({
        where: { id: 'mod-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      });
      expect(updated.status).toBe('COMPLETED');
    });
  });
});
