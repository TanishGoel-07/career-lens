import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, InterviewType, QuestionType } from '@career-lens/db';

const CURATED_QUESTIONS: Record<
  string,
  {
    title: string;
    promptText: string;
    difficulty: string;
    expectedConcepts: string[];
    testCases?: Array<{ input: string; expectedOutput: string }>;
  }
> = {
  'two-sum': {
    title: 'Two Sum',
    promptText:
      'Given an array of integers and a target integer, find the two numbers that add up to the target and print their 0-based space-separated indices.\n\nInput format:\nLine 1: space-separated integers\nLine 2: target integer\n\nOutput format:\nspace-separated indices\n\nExample:\nInput:\n2 7 11 15\n9\nOutput:\n0 1',
    difficulty: 'easy',
    expectedConcepts: ['hash map', 'array indexing', 'linear time complexity'],
    testCases: [
      { input: '2 7 11 15\n9\n', expectedOutput: '0 1' },
      { input: '3 2 4\n6\n', expectedOutput: '1 2' },
      { input: '3 3\n6\n', expectedOutput: '0 1' },
    ],
  },
  'reverse-string': {
    title: 'Reverse String',
    promptText:
      'Read a line from standard input and output the characters in reverse order.\n\nExample:\nInput: hello\nOutput: olleh',
    difficulty: 'easy',
    expectedConcepts: ['two pointers', 'string manipulation'],
    testCases: [
      { input: 'hello\n', expectedOutput: 'olleh' },
      { input: 'CareerLens\n', expectedOutput: 'sneLreeraC' },
      { input: 'racecar\n', expectedOutput: 'racecar' },
    ],
  },
  'palindrome': {
    title: 'Valid Palindrome',
    promptText:
      'Read a single string line from standard input. Output "true" if the string is a palindrome (reads same forward and backward), or "false" otherwise.\n\nExample:\nInput: radar\nOutput: true',
    difficulty: 'easy',
    expectedConcepts: ['strings', 'two pointer'],
    testCases: [
      { input: 'radar\n', expectedOutput: 'true' },
      { input: 'hello\n', expectedOutput: 'false' },
      { input: 'level\n', expectedOutput: 'true' },
    ],
  },
  'system-design': {
    title: 'Distributed Rate Limiter',
    promptText:
      'Design a scalable distributed rate limiter capable of enforcing limits on 100,000 requests/sec across multiple geographic regions. Discuss choice of Redis algorithms (Token Bucket vs Sliding Window Counter), race conditions, failure recovery, and client feedback (HTTP 429 Retry-After).',
    difficulty: 'hard',
    expectedConcepts: ['token bucket', 'redis', 'sliding window', 'distributed locks', 'eventual consistency'],
  },
  'behavioral': {
    title: 'Navigating Technical Conflict',
    promptText:
      'Describe a time when you strongly disagreed with an engineering decision or architectural direction chosen by a teammate or tech lead. How did you advocate for your point of view, resolve the difference, and what was the outcome?',
    difficulty: 'medium',
    expectedConcepts: ['STAR method', 'communication', 'conflict resolution', 'data-driven decision making'],
  },
};

@Injectable()
export class InterviewService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(userId: string, type: InterviewType): Promise<any> {
    return this.prisma.interviewSession.create({
      data: { userId, type },
      include: { questions: true },
    });
  }

  async listSessions(userId: string): Promise<any> {
    return this.prisma.interviewSession.findMany({
      where: { userId },
      include: {
        questions: {
          include: {
            answers: true,
            codeSubmissions: { orderBy: { submittedAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getSession(userId: string, sessionId: string): Promise<any> {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          include: {
            answers: true,
            codeSubmissions: { orderBy: { submittedAt: 'desc' } },
          },
        },
      },
    });
    if (!session || session.userId !== userId) throw new NotFoundException('Interview session not found.');
    return session;
  }

  async nextQuestion(userId: string, sessionId: string, topic: string, questionType: QuestionType): Promise<any> {
    const session = await this.prisma.interviewSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new NotFoundException('Interview session not found.');

    const cleanTopic = topic.toLowerCase().trim();
    let matched = CURATED_QUESTIONS[cleanTopic];

    if (!matched) {
      if (questionType === 'CODING') {
        matched = cleanTopic.includes('rev')
          ? CURATED_QUESTIONS['reverse-string']
          : cleanTopic.includes('pal')
            ? CURATED_QUESTIONS['palindrome']
            : CURATED_QUESTIONS['two-sum'];
      } else {
        matched = session.type === 'SYSTEM_DESIGN' || cleanTopic.includes('system') || cleanTopic.includes('design')
          ? CURATED_QUESTIONS['system-design']
          : CURATED_QUESTIONS['behavioral'];
      }
    }

    return this.prisma.interviewQuestion.create({
      data: {
        sessionId,
        topic: matched.title || topic,
        difficulty: matched.difficulty,
        expectedConcepts: matched.expectedConcepts,
        promptText: matched.promptText,
        questionType,
        testCases: (matched.testCases as any) ?? null,
      },
    });
  }

  async submitVerbalAnswer(userId: string, questionId: string, rawAnswer: string): Promise<any> {
    const question = await this.prisma.interviewQuestion.findUnique({
      where: { id: questionId },
      include: { session: true },
    });
    if (!question || question.session.userId !== userId) throw new NotFoundException('Question not found.');

    // Deterministic concept coverage check
    const concepts = (question.expectedConcepts as string[]) || [];
    const lowerAnswer = rawAnswer.toLowerCase();
    const coveredConcepts = concepts.filter((c) => lowerAnswer.includes(c.toLowerCase()));
    const score = concepts.length > 0 ? Math.round((coveredConcepts.length / concepts.length) * 100) : 80;

    return this.prisma.interviewAnswer.create({
      data: {
        questionId,
        rawAnswer,
        deterministicResult: { coveredConcepts, totalConcepts: concepts.length },
        score,
      },
    });
  }
}
