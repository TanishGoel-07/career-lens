import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService, CodeSubmissionStatus } from '@career-lens/db';
import { DockerRunner } from './runners/docker-runner';
import { LANGUAGE_CONFIGS } from './runners/language-configs';
import { TestCase } from './types';

@Injectable()
@Processor('code-execution', { concurrency: 2 })
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger('SubmissionProcessor');

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ submissionId: string }>): Promise<void> {
    const { submissionId } = job.data;
    const submission = await this.prisma.codeSubmission.findUnique({
      where: { id: submissionId },
      include: {
        interviewQuestion: true,
        problem: { include: { testCases: { orderBy: { orderIndex: 'asc' } } } },
      },
    });
    if (!submission) {
      this.logger.warn(`Submission ${submissionId} not found — skipping.`);
      return;
    }

    await this.prisma.codeSubmission.update({
      where: { id: submissionId },
      data: { status: CodeSubmissionStatus.RUNNING },
    });

    let testCases: TestCase[] = [];
    if (submission.problem?.testCases?.length) {
      testCases = submission.problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }));
    } else if (submission.interviewQuestion?.testCases) {
      testCases = (submission.interviewQuestion.testCases as TestCase[]) || [];
    }

    const config = LANGUAGE_CONFIGS[submission.language];
    const runner = new DockerRunner(config);

    try {
      const result = await runner.run(submission.sourceCode, testCases);
      const passedCount = result.testResults.filter((t) => t.passed).length;
      const totalCount = result.testResults.length;
      const allPassed = totalCount > 0 && passedCount === totalCount;

      const avgDuration = result.testResults.length
        ? Math.round(result.testResults.reduce((sum, t) => sum + t.durationMs, 0) / result.testResults.length)
        : 35;

      await this.prisma.codeSubmission.update({
        where: { id: submissionId },
        data: {
          status:
            result.status === 'TIMEOUT'
              ? CodeSubmissionStatus.TIMEOUT
              : result.status === 'FAILED' || !allPassed
                ? CodeSubmissionStatus.FAILED
                : CodeSubmissionStatus.COMPLETED,
          runtimeMs: avgDuration,
          memoryKb: 15400,
          testResults: {
            cases: result.testResults,
            compileError: result.compileError ?? null,
            passedCount,
            totalCount,
          } as any,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`Sandbox execution error for submission ${submissionId}: ${(err as Error).message}`);
      await this.prisma.codeSubmission.update({
        where: { id: submissionId },
        data: { status: CodeSubmissionStatus.FAILED, completedAt: new Date() },
      });
    }
  }
}
