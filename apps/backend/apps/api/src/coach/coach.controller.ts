import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CoachService } from './coach.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class CoachMessageDto {
  @IsString()
  sessionId!: string;
  @IsString()
  message!: string;
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
}
