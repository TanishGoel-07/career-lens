import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('matching')
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get(':resumeId/:jobId')
  compute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('resumeId') resumeId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.matchingService.computeMatch(user.id, resumeId, jobId);
  }
}
