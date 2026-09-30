import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, InterviewType, QuestionType } from '@career-lens/db';

export interface AnswerEvaluationResult {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  coveredConcepts: string[];
  missingConcepts: string[];
  feedback: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

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

  async nextQuestion(
    userId: string,
    sessionId: string,
    topic: string,
    questionType: QuestionType,
  ): Promise<any> {
    const [session, targetRoles, latestResume] = await Promise.all([
      this.prisma.interviewSession.findUnique({ where: { id: sessionId } }),
      this.prisma.targetRole.findMany({ where: { userId }, take: 1 }),
      this.prisma.resume.findFirst({
        where: { userId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!session || session.userId !== userId) throw new NotFoundException('Interview session not found.');

    const targetTitle = targetRoles[0]?.title || 'Software Engineer';
    const resumeSkills = (latestResume?.extractedSkills as string[]) || ['TypeScript', 'System Design'];

    let title = topic || 'System Architecture';
    let difficulty = 'medium';
    let promptText = '';
    let expectedConcepts: string[] = [];
    let testCases: any = null;

    if (questionType === QuestionType.CODING) {
      if (topic.toLowerCase().includes('palindrome')) {
        title = 'Valid Palindrome & Substring';
        difficulty = 'easy';
        promptText =
          'Given a string line from standard input, determine if it is a palindrome considering alphanumeric characters and ignoring cases. Output "true" or "false".\n\nExample: "A man, a plan, a canal: Panama" -> true';
        expectedConcepts = ['two pointers', 'string normalization', 'time complexity O(n)'];
        testCases = [
          { input: 'radar\n', expectedOutput: 'true' },
          { input: 'hello\n', expectedOutput: 'false' },
          { input: 'level\n', expectedOutput: 'true' },
        ];
      } else if (topic.toLowerCase().includes('reverse')) {
        title = 'Reverse Words in String';
        difficulty = 'easy';
        promptText =
          'Read a single string line from standard input and output the reversed sequence of characters.\n\nExample:\nInput: CareerLens\nOutput: sneLreeraC';
        expectedConcepts = ['two pointers', 'in-place reversal', 'strings'];
        testCases = [
          { input: 'hello\n', expectedOutput: 'olleh' },
          { input: 'CareerLens\n', expectedOutput: 'sneLreeraC' },
          { input: 'racecar\n', expectedOutput: 'racecar' },
        ];
      } else {
        title = `Two Sum Target Pair (${targetTitle})`;
        difficulty = 'easy';
        promptText =
          'Given an array of integers on line 1 and a target sum on line 2, find the two numbers that add up to the target and print their 0-based indices separated by space.\n\nExample:\n2 7 11 15\n9\nOutput:\n0 1';
        expectedConcepts = ['hash map', 'array indexing', 'O(n) time complexity'];
        testCases = [
          { input: '2 7 11 15\n9\n', expectedOutput: '0 1' },
          { input: '3 2 4\n6\n', expectedOutput: '1 2' },
          { input: '3 3\n6\n', expectedOutput: '0 1' },
        ];
      }
    } else {
      // VERBAL QUESTIONS: Tailored by session type & user background
      if (session.type === InterviewType.SYSTEM_DESIGN) {
        title = `Distributed Caching & Rate Limiting for ${targetTitle}`;
        difficulty = 'hard';
        promptText =
          `You are interviewing for ${targetTitle}. Design a fault-tolerant, horizontally scalable rate limiting service handling 100,000 requests/second. Explain your storage strategy (Redis cluster vs local memory), algorithm (Token Bucket vs Sliding Window Counter), race condition prevention, and how to handle degraded downstream dependencies.`;
        expectedConcepts = ['token bucket', 'sliding window', 'redis', 'race conditions', 'distributed locks', 'rate limiting', 'eventual consistency'];
      } else if (session.type === InterviewType.BEHAVIORAL) {
        title = 'STAR Behavioral Scenario: Technical Conflict & Delivery';
        difficulty = 'medium';
        promptText =
          `Tell me about a time when you experienced a critical disagreement with a colleague or lead regarding architecture or code design. How did you present your arguments, use data or benchmarks to reach a consensus, and what was the impact on project delivery?`;
        expectedConcepts = ['situation', 'task', 'action', 'result', 'data-driven', 'collaboration', 'conflict resolution'];
      } else if (session.type === InterviewType.HR) {
        title = `Career Trajectory & Culture Fit (${targetTitle})`;
        difficulty = 'easy';
        promptText =
          `What attracts you to this ${targetTitle} role, how do your previous projects (utilizing ${resumeSkills.slice(0, 3).join(', ')}) prepare you for high-ownership delivery, and how do you prioritize work under competing deadlines?`;
        expectedConcepts = ['ownership', 'prioritization', 'communication', 'impact', 'growth mindset'];
      } else {
        // TECHNICAL
        title = `Deep Dive: Concurrency, Caching & Reliability (${targetTitle})`;
        difficulty = 'medium';
        promptText =
          `Explain how database transaction isolation levels (Read Committed vs Repeatable Read vs Serializable) prevent phenomena like dirty reads and phantom reads. In your explanation, reference how you have applied caching or transactions in your past projects.`;
        expectedConcepts = ['acid', 'transactions', 'isolation levels', 'dirty read', 'phantom read', 'optimistic locking', 'indexing'];
      }
    }

    return this.prisma.interviewQuestion.create({
      data: {
        sessionId,
        topic: title,
        difficulty,
        expectedConcepts,
        promptText,
        questionType,
        testCases,
      },
    });
  }

  async submitVerbalAnswer(userId: string, questionId: string, rawAnswer: string): Promise<any> {
    const question = await this.prisma.interviewQuestion.findUnique({
      where: { id: questionId },
      include: { session: true },
    });
    if (!question || question.session.userId !== userId) throw new NotFoundException('Question not found.');

    const concepts = (question.expectedConcepts as string[]) || [];
    const lowerAnswer = rawAnswer.toLowerCase();
    const words = rawAnswer.split(/\s+/).filter(Boolean);

    // Concept Coverage
    const coveredConcepts = concepts.filter((c) => lowerAnswer.includes(c.toLowerCase()));
    const missingConcepts = concepts.filter((c) => !lowerAnswer.includes(c.toLowerCase()));

    // Multi-dimensional Scoring
    const conceptScore = concepts.length > 0 ? (coveredConcepts.length / concepts.length) * 100 : 75;
    const technicalScore = Math.min(100, Math.round(conceptScore * 0.9 + (words.length > 50 ? 10 : 0)));

    // Communication Score: length, structure, clarity
    let communicationScore = 70;
    if (words.length >= 60 && words.length <= 350) communicationScore += 20;
    else if (words.length < 30) communicationScore -= 25;
    if (rawAnswer.includes('.') || rawAnswer.includes(',')) communicationScore += 10;
    communicationScore = Math.min(100, Math.max(30, communicationScore));

    // Confidence & STAR Structure Score
    const starIndicators = ['situation', 'task', 'action', 'result', 'because', 'first', 'then', 'finally', 'metric', 'improved', 'learned'];
    const starMatches = starIndicators.filter((i) => lowerAnswer.includes(i)).length;
    const confidenceScore = Math.min(100, Math.max(40, Math.round(50 + starMatches * 8)));

    const overallScore = Math.round(technicalScore * 0.5 + communicationScore * 0.25 + confidenceScore * 0.25);

    const strengths: string[] = [];
    if (coveredConcepts.length > 0) {
      strengths.push(`Clearly articulated core concepts: ${coveredConcepts.slice(0, 3).join(', ')}.`);
    }
    if (words.length >= 60) {
      strengths.push('Provided adequate depth and explanatory context rather than a surface answer.');
    }
    if (starMatches >= 2) {
      strengths.push('Structured thoughts logically with cause-and-effect progression.');
    }

    const improvements: string[] = [];
    if (missingConcepts.length > 0) {
      improvements.push(`Mention key architectural terms: ${missingConcepts.slice(0, 3).join(', ')}.`);
    }
    if (words.length < 50) {
      improvements.push('Elaborate with real-world project context or quantifiable outcomes to sound more senior.');
    }

    const evaluation: AnswerEvaluationResult = {
      overallScore,
      technicalScore,
      communicationScore,
      confidenceScore,
      coveredConcepts,
      missingConcepts,
      feedback:
        overallScore >= 80
          ? 'Strong, articulate response demonstrating solid technical command and structured communication.'
          : 'Good foundation. Deepen your explanation by addressing edge cases and citing specific metrics.',
      strengths,
      improvements,
      modelAnswer:
        `A high-scoring answer addresses: ${concepts.join(', ')}. ` +
        `State the challenge clearly, describe your architectural or behavioral decision, justify trade-offs, and state the quantified business outcome.`,
    };

    return this.prisma.interviewAnswer.create({
      data: {
        questionId,
        rawAnswer,
        deterministicResult: { coveredConcepts, missingConcepts },
        aiEvaluation: evaluation as any,
        score: overallScore,
      },
    });
  }
}
