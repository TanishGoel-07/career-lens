import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { CodeExecutionService } from './code-execution.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class SubmitCodeDto {
  @IsString() interviewQuestionId!: string;
  @IsIn(['PYTHON', 'CPP', 'JAVA']) language!: 'PYTHON' | 'CPP' | 'JAVA';
  @IsString() sourceCode!: string;
}

@ApiTags('code-execution')
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class CodeExecutionController {
  constructor(private readonly service: CodeExecutionService) {}

  @Post()
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitCodeDto) {
    return this.service.submit(user.id, dto.interviewQuestionId, dto.language as any, dto.sourceCode);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getResult(user.id, id);
  }
}
