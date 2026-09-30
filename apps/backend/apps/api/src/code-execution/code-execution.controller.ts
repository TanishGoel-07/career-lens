import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CodeExecutionService } from './code-execution.service';
import { CodingProblemsService } from './coding-problems.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
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

class HintProblemDto {
  @IsOptional() @IsString() currentCode?: string;
  @IsOptional() hintIndex?: number;
}

class DebugCodeDto {
  @IsOptional() @IsIn(['PYTHON', 'CPP', 'JAVA']) language?: 'PYTHON' | 'CPP' | 'JAVA';
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() sourceCode?: string;
  @IsOptional() @IsString() errorOutput?: string;
}

class ReviewCodeDto {
  @IsOptional() @IsIn(['PYTHON', 'CPP', 'JAVA']) language?: 'PYTHON' | 'CPP' | 'JAVA';
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() sourceCode?: string;
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

  // --- Coding Problems Catalog & Practice Endpoints --------------------------

  @Get(['coding-problems', 'practice/problems'])
  listProblems(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return this.problemsService.listProblems(undefined, category, difficulty);
  }

  @Get(['coding-problems/:slug', 'practice/problems/:slug'])
  getProblemBySlug(@Param('slug') slug: string) {
    return this.problemsService.getProblemBySlug(slug);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post(['coding-problems/:id/submit', 'practice/problems/:id/submit'])
  async submitProblemSolution(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id') problemId: string,
    @Body() dto: SubmitProblemDto,
  ) {
    let resolvedUserId = user?.id;
    if (!resolvedUserId) {
      resolvedUserId = await this.problemsService.getFallbackUserId();
    }
    return this.service.submit(resolvedUserId, { problemId }, dto.language as any, dto.sourceCode);
  }

  @Get(['coding-problems/:id/hints/:level', 'practice/problems/:id/hints/:level'])
  getHint(@Param('id') problemId: string, @Param('level', ParseIntPipe) level: number) {
    return this.problemsService.getHint(problemId, level);
  }

  @Post(['coding-problems/:id/hint', 'practice/problems/:id/hint'])
  postHint(
    @Param('id') problemId: string,
    @Body() dto: HintProblemDto,
  ) {
    const level = Number(dto.hintIndex ?? 1);
    return this.problemsService.getHint(problemId, level);
  }

  @Post(['coding-problems/:id/debug', 'practice/problems/:id/debug'])
  debugProblem(
    @Param('id') problemId: string,
    @Body() dto: DebugCodeDto,
  ) {
    const code = dto.sourceCode || dto.code || '';
    const lang = dto.language || 'PYTHON';
    return this.service.debugCode(problemId, lang, code, dto.errorOutput);
  }

  @Post(['coding-problems/:id/review', 'practice/problems/:id/review'])
  reviewProblem(
    @Param('id') problemId: string,
    @Body() dto: ReviewCodeDto,
  ) {
    const code = dto.sourceCode || dto.code || '';
    const lang = dto.language || 'PYTHON';
    return this.service.reviewCode(problemId, lang, code);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['coding-problems/stats/mine', 'practice/problems/stats/mine'])
  getMyStats(@CurrentUser() user: AuthenticatedUser) {
    return this.problemsService.getUserCodingStats(user.id);
  }
}
