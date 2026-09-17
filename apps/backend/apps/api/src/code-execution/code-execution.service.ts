import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService, CodeLanguage, CodeSubmissionStatus } from '@career-lens/db';

const MAX_SOURCE_BYTES = 64 * 1024; // 64KB — generous for interview answers, bounds queue/worker payload size

/**
 * The API NEVER executes submitted code. It validates, persists, and
 * enqueues onto a queue that only the separate sandbox-worker process
 * consumes (architecture §16 — hard requirement, not a convention).
 */
@Injectable()
export class CodeExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('code-execution') private readonly queue: Queue,
  ) {}

  async submit(userId: string, interviewQuestionId: string, language: CodeLanguage, sourceCode: string) {
    if (Buffer.byteLength(sourceCode, 'utf8') > MAX_SOURCE_BYTES) {
      throw new BadRequestException('Submission exceeds the maximum allowed size.');
    }

    const question = await this.prisma.interviewQuestion.findUnique({
      where: { id: interviewQuestionId },
      include: { session: true },
    });
    if (!question || question.session.userId !== userId) {
      throw new NotFoundException('Interview question not found.');
    }

    const submission = await this.prisma.codeSubmission.create({
      data: { interviewQuestionId, userId, language, sourceCode, status: CodeSubmissionStatus.QUEUED },
    });

    await this.queue.add(
      'run-submission',
      { submissionId: submission.id },
      {
        attempts: 1, // code execution is NOT safely retryable by default — a timing-out
        // submission should surface as TIMEOUT, not silently re-run; a
        // human/product decision is required before enabling job retries here.
        removeOnComplete: 200,
        removeOnFail: false,
        jobId: `run-submission:${submission.id}`,
      },
    );

    return submission;
  }

  async getResult(userId: string, submissionId: string) {
    const submission = await this.prisma.codeSubmission.findUnique({ where: { id: submissionId } });
    if (!submission || submission.userId !== userId) throw new NotFoundException('Submission not found.');
    return submission;
  }
}
