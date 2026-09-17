import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import { PrismaService } from '@career-lens/db';
import { RoadmapService } from './roadmap.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class GenerateRoadmapDto {
  @IsInt() @Min(1)
  hoursPerWeek!: number;
}

class UpdateModuleStatusDto {
  @IsIn(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])
  status!: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

@ApiTags('roadmap')
@UseGuards(JwtAuthGuard)
@Controller()
export class RoadmapController {
  constructor(
    private readonly roadmapService: RoadmapService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('target-roles/:id/roadmap')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') targetRoleId: string,
    @Body() dto: GenerateRoadmapDto,
  ) {
    return this.roadmapService.generate(user.id, targetRoleId, dto.hoursPerWeek);
  }

  @Get('roadmaps/mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.roadmap.findMany({
      where: { userId: user.id },
      include: { modules: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  @Post('roadmap-modules/:id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') moduleId: string,
    @Body() dto: UpdateModuleStatusDto,
  ) {
    return this.roadmapService.updateModuleStatus(user.id, moduleId, dto.status);
  }
}
