import { Body, Controller, Get, Param, Post, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService, SkillSource, SkillImportance } from '@career-lens/db';
import { SkillGapService } from './skill-gap.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class AddUserSkillDto {
  @IsString()
  skillName!: string;
}

class RoleSkillInputDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsIn(['REQUIRED', 'OPTIONAL'])
  importance?: 'REQUIRED' | 'OPTIONAL';

  @IsOptional()
  @IsInt()
  @Min(1)
  minProficiency?: number;
}

class CreateTargetRoleDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleSkillInputDto)
  skills?: RoleSkillInputDto[];
}

class AddRoleSkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleSkillInputDto)
  skills!: RoleSkillInputDto[];
}

const DEFAULT_ROLE_SKILLS: Record<string, Array<{ name: string; importance: SkillImportance }>> = {
  backend: [
    { name: 'PostgreSQL', importance: SkillImportance.REQUIRED },
    { name: 'Transactions', importance: SkillImportance.REQUIRED },
    { name: 'Redis', importance: SkillImportance.REQUIRED },
    { name: 'Caching', importance: SkillImportance.REQUIRED },
    { name: 'System Design', importance: SkillImportance.REQUIRED },
    { name: 'Distributed Systems', importance: SkillImportance.OPTIONAL },
    { name: 'Indexing', importance: SkillImportance.OPTIONAL },
  ],
  frontend: [
    { name: 'React', importance: SkillImportance.REQUIRED },
    { name: 'TypeScript', importance: SkillImportance.REQUIRED },
    { name: 'Next.js', importance: SkillImportance.REQUIRED },
    { name: 'CSS / Tailwind', importance: SkillImportance.REQUIRED },
    { name: 'State Management', importance: SkillImportance.OPTIONAL },
  ],
  fullstack: [
    { name: 'React', importance: SkillImportance.REQUIRED },
    { name: 'TypeScript', importance: SkillImportance.REQUIRED },
    { name: 'PostgreSQL', importance: SkillImportance.REQUIRED },
    { name: 'System Design', importance: SkillImportance.REQUIRED },
    { name: 'Redis', importance: SkillImportance.OPTIONAL },
  ],
};

@ApiTags('skills')
@UseGuards(JwtAuthGuard)
@Controller()
export class SkillsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gapService: SkillGapService,
  ) {}

  @Post('skills/mine')
  async addUserSkill(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddUserSkillDto): Promise<any> {
    const skill = await this.prisma.skill.upsert({
      where: { name: dto.skillName },
      update: {},
      create: { name: dto.skillName },
    });
    return this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId: user.id, skillId: skill.id } },
      update: {},
      create: { userId: user.id, skillId: skill.id, source: SkillSource.SELF_REPORTED },
    });
  }

  @Get('skills/mine')
  listUserSkills(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.prisma.userSkill.findMany({ where: { userId: user.id }, include: { skill: true } });
  }

  @Get('target-roles')
  listTargetRoles(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.prisma.targetRole.findMany({
      where: { userId: user.id },
      include: {
        roleSkills: { include: { skill: true } },
        roadmaps: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('target-roles')
  async createTargetRole(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTargetRoleDto): Promise<any> {
    const targetRole = await this.prisma.targetRole.create({
      data: { userId: user.id, title: dto.title },
    });

    let skillsToAttach = dto.skills;
    if (!skillsToAttach || skillsToAttach.length === 0) {
      const lower = dto.title.toLowerCase();
      if (lower.includes('front')) {
        skillsToAttach = DEFAULT_ROLE_SKILLS.frontend;
      } else if (lower.includes('full') || lower.includes('software')) {
        skillsToAttach = DEFAULT_ROLE_SKILLS.fullstack;
      } else {
        skillsToAttach = DEFAULT_ROLE_SKILLS.backend;
      }
    }

    for (const s of skillsToAttach) {
      const skill = await this.prisma.skill.upsert({
        where: { name: s.name },
        update: {},
        create: { name: s.name },
      });
      await this.prisma.roleSkill.upsert({
        where: { roleId_skillId: { roleId: targetRole.id, skillId: skill.id } },
        update: {
          importance: (s.importance as SkillImportance) || SkillImportance.REQUIRED,
          minProficiency: s.minProficiency ?? 1,
        },
        create: {
          roleId: targetRole.id,
          skillId: skill.id,
          importance: (s.importance as SkillImportance) || SkillImportance.REQUIRED,
          minProficiency: s.minProficiency ?? 1,
        },
      });
    }

    return this.prisma.targetRole.findUnique({
      where: { id: targetRole.id },
      include: { roleSkills: { include: { skill: true } } },
    });
  }

  @Post('target-roles/:id/skills')
  async addRoleSkills(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') targetRoleId: string,
    @Body() dto: AddRoleSkillsDto,
  ): Promise<any> {
    const targetRole = await this.prisma.targetRole.findUnique({ where: { id: targetRoleId } });
    if (!targetRole || targetRole.userId !== user.id) {
      throw new NotFoundException('Target role not found.');
    }

    for (const s of dto.skills) {
      const skill = await this.prisma.skill.upsert({
        where: { name: s.name },
        update: {},
        create: { name: s.name },
      });
      await this.prisma.roleSkill.upsert({
        where: { roleId_skillId: { roleId: targetRoleId, skillId: skill.id } },
        update: {
          importance: (s.importance as SkillImportance) || SkillImportance.REQUIRED,
          minProficiency: s.minProficiency ?? 1,
        },
        create: {
          roleId: targetRoleId,
          skillId: skill.id,
          importance: (s.importance as SkillImportance) || SkillImportance.REQUIRED,
          minProficiency: s.minProficiency ?? 1,
        },
      });
    }

    return this.prisma.targetRole.findUnique({
      where: { id: targetRoleId },
      include: { roleSkills: { include: { skill: true } } },
    });
  }

  @Get('target-roles/:id/skill-gaps')
  computeGaps(@CurrentUser() user: AuthenticatedUser, @Param('id') targetRoleId: string): Promise<any> {
    return this.gapService.computeForUser(user.id, targetRoleId);
  }
}
