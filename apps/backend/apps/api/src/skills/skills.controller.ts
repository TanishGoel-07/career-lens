import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PrismaService, SkillSource } from '@career-lens/db';
import { SkillGapService } from './skill-gap.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class AddUserSkillDto {
  @IsString()
  skillName!: string;
}

class CreateTargetRoleDto {
  @IsString()
  title!: string;
}

@ApiTags('skills')
@UseGuards(JwtAuthGuard)
@Controller()
export class SkillsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gapService: SkillGapService,
  ) {}

  @Post('skills/mine')
  async addUserSkill(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddUserSkillDto) {
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
  listUserSkills(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.userSkill.findMany({ where: { userId: user.id }, include: { skill: true } });
  }

  @Post('target-roles')
  createTargetRole(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTargetRoleDto) {
    return this.prisma.targetRole.create({ data: { userId: user.id, title: dto.title } });
  }

  @Get('target-roles/:id/skill-gaps')
  computeGaps(@CurrentUser() user: AuthenticatedUser, @Param('id') targetRoleId: string) {
    return this.gapService.computeForUser(user.id, targetRoleId);
  }
}
