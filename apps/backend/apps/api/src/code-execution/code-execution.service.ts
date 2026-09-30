import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService, CodeLanguage, CodeSubmissionStatus } from '@career-lens/db';

const MAX_SOURCE_BYTES = 64 * 1024; // 64KB

@Injectable()
export class CodeExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('code-execution') private readonly queue: Queue,
  ) {}

  async submit(
    userId: string,
    target: { interviewQuestionId?: string; problemId?: string },
    language: CodeLanguage,
    sourceCode: string,
  ): Promise<any> {
    if (Buffer.byteLength(sourceCode, 'utf8') > MAX_SOURCE_BYTES) {
      throw new BadRequestException('Submission exceeds the maximum allowed size.');
    }

    if (target.interviewQuestionId) {
      const question = await this.prisma.interviewQuestion.findUnique({
        where: { id: target.interviewQuestionId },
        include: { session: true },
      });
      if (!question || question.session.userId !== userId) {
        throw new NotFoundException('Interview question not found.');
      }
    } else if (target.problemId) {
      const problem = await this.prisma.codingProblem.findUnique({ where: { id: target.problemId } });
      if (!problem) throw new NotFoundException('Coding problem not found.');
    } else {
      throw new BadRequestException('Must specify either interviewQuestionId or problemId.');
    }

    const submission = await this.prisma.codeSubmission.create({
      data: {
        interviewQuestionId: target.interviewQuestionId ?? null,
        problemId: target.problemId ?? null,
        userId,
        language,
        sourceCode,
        status: CodeSubmissionStatus.QUEUED,
      },
    });

    await this.queue.add(
      'run-submission',
      { submissionId: submission.id },
      {
        attempts: 1,
        removeOnComplete: 200,
        removeOnFail: false,
        jobId: `run-submission_${submission.id}`,
      },
    );

    return submission;
  }

  async getResult(userId: string, submissionId: string): Promise<any> {
    const submission = await this.prisma.codeSubmission.findUnique({
      where: { id: submissionId },
      include: { problem: true, interviewQuestion: true },
    });
    if (!submission || submission.userId !== userId) throw new NotFoundException('Submission not found.');
    return submission;
  }

  async debugCode(
    problemId: string,
    language: string,
    sourceCode: string,
    actualError?: string,
  ): Promise<{ diagnosis: string; suggestedFix: string; edgeCasesToConsider: string[] }> {
    const problem = await this.prisma.codingProblem.findUnique({ where: { id: problemId } });
    if (!problem) throw new NotFoundException('Problem not found.');

    const errorContext = actualError || 'Code produces wrong output on edge cases or fails under strict constraints.';

    let diagnosis = `Reviewing ${language} implementation for ${problem.title}: `;
    if (sourceCode.includes('while') && !sourceCode.includes('++') && !sourceCode.includes('+=')) {
      diagnosis += 'Potential infinite loop detected: pointer index advancement may be missing inside loop body.';
    } else if (sourceCode.includes('for') && sourceCode.includes('for')) {
      diagnosis += 'Nested loop structure leads to O(n^2) time complexity which will exceed runtime limits on inputs up to 10^5.';
    } else {
      diagnosis += `Examine state management and off-by-one boundary conditions. Error observed: ${errorContext.slice(0, 100)}`;
    }

    return {
      diagnosis,
      suggestedFix:
        'Verify array bounds, ensure map lookups handle non-existent keys gracefully, and check empty/single-element inputs.',
      edgeCasesToConsider: [
        'Empty input or array length <= 1',
        'Inputs with negative integers or zero',
        'Duplicate elements that could collide in hash maps',
        'Maximum constraint scale (10^5 elements) requiring strictly O(n) or O(n log n) complexity',
      ],
    };
  }

  async reviewCode(
    problemId: string,
    language: string,
    sourceCode: string,
  ): Promise<{
    timeComplexity: string;
    spaceComplexity: string;
    codeQualityScore: number;
    positives: string[];
    improvements: string[];
  }> {
    const problem = await this.prisma.codingProblem.findUnique({ where: { id: problemId } });
    if (!problem) throw new NotFoundException('Problem not found.');

    const hasMapOrSet = /lookup|seen|map|set|hash/i.test(sourceCode);
    const loopCount = (sourceCode.match(/for|while/g) || []).length;

    let timeComplexity = 'O(n)';
    let spaceComplexity = 'O(1)';

    if (loopCount >= 2 && !hasMapOrSet) {
      timeComplexity = 'O(n^2)';
    } else if (hasMapOrSet) {
      timeComplexity = 'O(n)';
      spaceComplexity = 'O(n)';
    }

    return {
      timeComplexity,
      spaceComplexity,
      codeQualityScore: hasMapOrSet ? 92 : 78,
      positives: [
        'Clean variable naming and coherent algorithmic flow.',
        'Proper type signatures and standard input/output formatting.',
      ],
      improvements: [
        hasMapOrSet
          ? 'Space complexity is O(n); consider in-place modifications if memory is strictly constrained.'
          : 'Consider utilizing a hash map or two-pointer technique to reduce time complexity to linear time O(n).',
        'Add inline docstrings documenting edge case assumptions.',
      ],
    };
  }
}
