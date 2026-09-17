import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PrismaService, SavedJobStatus } from '@career-lens/db';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class SearchJobsQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() cursor?: string;
}

class SaveJobDto {
  @IsIn(['SAVED', 'APPLIED', 'INTERVIEWING', 'REJECTED', 'OFFER'])
  status!: SavedJobStatus;
  @IsOptional() @IsString() notes?: string;
}

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Public search — pagination is cursor-based per the API contract
   *  conventions (architecture §20): stable under concurrent ingestion,
   *  unlike offset pagination on a fast-growing table. */
  @Get()
  async search(@Query() query: SearchJobsQuery) {
    const pageSize = 20;
    const jobs = await this.prisma.job.findMany({
      where: {
        AND: [
          query.q
            ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { company: { contains: query.q, mode: 'insensitive' } }] }
            : {},
          query.location ? { location: { contains: query.location, mode: 'insensitive' } } : {},
        ],
      },
      orderBy: { id: 'asc' },
      take: pageSize + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = jobs.length > pageSize;
    const page = hasMore ? jobs.slice(0, pageSize) : jobs;
    return { data: page, meta: { nextCursor: hasMore ? page[page.length - 1].id : null } };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.job.findUniqueOrThrow({ where: { id } });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  save(@CurrentUser() user: AuthenticatedUser, @Param('id') jobId: string, @Body() dto: SaveJobDto) {
    return this.prisma.savedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId } },
      update: { status: dto.status, notes: dto.notes },
      create: { userId: user.id, jobId, status: dto.status, notes: dto.notes },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('saved/mine')
  listSaved(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.savedJob.findMany({ where: { userId: user.id }, include: { job: true } });
  }
}
