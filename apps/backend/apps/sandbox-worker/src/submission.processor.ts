import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService, CodeSubmissionStatus } from '@career-lens/db';
import { DockerRunner } from './runners/docker-runner';
import { LANGUAGE_CONFIGS } from './runners/language-configs';
import { TestCase } from './types';

/**
 * Consumes the `code-execution` queue. This process is the ONLY place
 * in the whole system that runs untrusted user code, and it does so
 * exclusively via DockerRunner's isolated containers — never via a
 * bare child_process.exec on the host (architecture §16 hard rule).
 */
@Injectable()
@Processor('code-execution', { concurrency: 2 }) // deliberately low: each run is resource-capped but the HOST still has finite CPU
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger('SubmissionProcessor');

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ submissionId: string }>): Promise<void> {
    const { submissionId } = job.data;
    const submission = await this.prisma.codeSubmission.findUnique({
      where: { id: submissionId },
      include: { interviewQuestion: true },
    });
    if (!submission) {
      this.logger.warn(`Submission ${submissionId} not found — skipping.`);
      return;
    }

    await this.prisma.codeSubmission.update({
      where: { id: submissionId },
      data: { status: CodeSubmissionStatus.RUNNING },
    });

    // Test cases are expected to live on the InterviewQuestion record
    // (expectedConcepts/promptText today; a dedicated TestCase table is
    // the natural next step once the curated question bank exists —
    // using an empty set here rather than fabricating sample cases).
    const testCases: TestCase[] = (submission.interviewQuestion.testCases as TestCase[] | null) ?? [];

    const config = LANGUAGE_CONFIGS[submission.language];
    const runner = new DockerRunner(config);

    try {
      const result = await runner.run(submission.sourceCode, testCases);

      await this.prisma.codeSubmission.update({
        where: { id: submissionId },
        data: {
          status:
            result.status === 'TIMEOUT'
              ? CodeSubmissionStatus.TIMEOUT
              : result.status === 'FAILED'
                ? CodeSubmissionStatus.FAILED
                : CodeSubmissionStatus.COMPLETED,
          testResults: {
            cases: result.testResults,
            compileError: result.compileError ?? null,
            passedCount: result.testResults.filter((t) => t.passed).length,
            totalCount: result.testResults.length,
          },
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`Sandbox execution error for submission ${submissionId}: ${(err as Error).message}`);
      await this.prisma.codeSubmission.update({
        where: { id: submissionId },
        data: { status: CodeSubmissionStatus.FAILED, completedAt: new Date() },
      });
      // Deliberately not rethrown: attempts=1 was set at enqueue time
      // (see api/code-execution.service.ts) specifically so a failed
      // run surfaces as FAILED/TIMEOUT rather than being silently
      // retried against a resource-capped host.
    }
  }
}
