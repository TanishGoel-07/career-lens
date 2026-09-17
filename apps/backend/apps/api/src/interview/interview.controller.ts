import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { InterviewService } from './interview.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class StartSessionDto {
  @IsIn(['TECHNICAL', 'HR', 'BEHAVIORAL', 'SYSTEM_DESIGN'])
  type!: 'TECHNICAL' | 'HR' | 'BEHAVIORAL' | 'SYSTEM_DESIGN';
}

class NextQuestionDto {
  @IsString() topic!: string;
  @IsIn(['CODING', 'VERBAL']) questionType!: 'CODING' | 'VERBAL';
}

class VerbalAnswerDto {
  @IsString() rawAnswer!: string;
}

@ApiTags('interview')
@UseGuards(JwtAuthGuard)
@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('sessions')
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartSessionDto) {
    return this.interviewService.startSession(user.id, dto.type as any);
  }

  @Post('sessions/:id/next-question')
  next(@CurrentUser() user: AuthenticatedUser, @Param('id') sessionId: string, @Body() dto: NextQuestionDto) {
    return this.interviewService.nextQuestion(user.id, sessionId, dto.topic, dto.questionType as any);
  }

  @Post('questions/:id/answer')
  answer(@CurrentUser() user: AuthenticatedUser, @Param('id') questionId: string, @Body() dto: VerbalAnswerDto) {
    return this.interviewService.submitVerbalAnswer(user.id, questionId, dto.rawAnswer);
  }
}
