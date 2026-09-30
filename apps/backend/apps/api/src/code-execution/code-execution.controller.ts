import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CodeExecutionService } from './code-execution.service';
import { CodingProblemsService } from './coding-problems.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class SubmitInterviewCodeDto {
  @IsOptional() @IsString() interviewQuestionId?: string;
  @IsOptional() @IsString() problemId?: string;
  @IsIn(['PYTHON', 'CPP', 'JAVA']) language!: 'PYTHON' | 'CPP' | 'JAVA';
  @IsString() sourceCode!: string;
}

class SubmitProblemDto {
  @IsIn(['PYTHON', 'CPP', 'JAVA']) language!: 'PYTHON' | 'CPP' | 'JAVA';
  @IsString() sourceCode!: string;
}

class DebugCodeDto {
  @IsIn(['PYTHON', 'CPP', 'JAVA']) language!: 'PYTHON' | 'CPP' | 'JAVA';
  @IsString() sourceCode!: string;
  @IsOptional() @IsString() errorOutput?: string;
}

class ReviewCodeDto {
  @IsIn(['PYTHON', 'CPP', 'JAVA']) language!: 'PYTHON' | 'CPP' | 'JAVA';
  @IsString() sourceCode!: string;
}

@ApiTags('code-execution')
@Controller()
export class CodeExecutionController {
  constructor(
    private readonly service: CodeExecutionService,
    private readonly problemsService: CodingProblemsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('submissions')
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitInterviewCodeDto) {
    return this.service.submit(
      user.id,
      { interviewQuestionId: dto.interviewQuestionId, problemId: dto.problemId },
      dto.language as any,
      dto.sourceCode,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getResult(user.id, id);
  }

  // --- Coding Problems Catalog -----------------------------------------------

  @Get('coding-problems')
  listProblems(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return this.problemsService.listProblems(undefined, category, difficulty);
  }

  @Get('coding-problems/:slug')
  getProblemBySlug(@Param('slug') slug: string) {
    return this.problemsService.getProblemBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post('coding-problems/:id/submit')
  submitProblemSolution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') problemId: string,
    @Body() dto: SubmitProblemDto,
  ) {
    return this.service.submit(user.id, { problemId }, dto.language as any, dto.sourceCode);
  }

  @Get('coding-problems/:id/hints/:level')
  getHint(@Param('id') problemId: string, @Param('level', ParseIntPipe) level: number) {
    return this.problemsService.getHint(problemId, level);
  }

  @Post('coding-problems/:id/debug')
  debugProblem(
    @Param('id') problemId: string,
    @Body() dto: DebugCodeDto,
  ) {
    return this.service.debugCode(problemId, dto.language, dto.sourceCode, dto.errorOutput);
  }

  @Post('coding-problems/:id/review')
  reviewProblem(
    @Param('id') problemId: string,
    @Body() dto: ReviewCodeDto,
  ) {
    return this.service.reviewCode(problemId, dto.language, dto.sourceCode);
  }

  @UseGuards(JwtAuthGuard)
  @Get('coding-problems/stats/mine')
  getMyStats(@CurrentUser() user: AuthenticatedUser) {
    return this.problemsService.getUserCodingStats(user.id);
  }
}
