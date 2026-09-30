import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CoachService } from './coach.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class CoachMessageDto {
  @IsString()
  sessionId!: string;
  @IsString()
  message!: string;
}

class CreateCoachSessionDto {
  @IsOptional()
  @IsString()
  title?: string;
}

@ApiTags('coach')
@UseGuards(JwtAuthGuard)
@Controller('coach')
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Post('message')
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: CoachMessageDto) {
    return this.coachService.chat(user.id, dto.sessionId, dto.message);
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.coachService.listSessions(user.id);
  }

  @Post('sessions')
  createSession(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCoachSessionDto) {
    return this.coachService.getOrCreateSession(user.id);
  }

  @Get('sessions/:id/messages')
  getMessages(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.coachService.getSessionMessages(user.id, id);
  }
}
