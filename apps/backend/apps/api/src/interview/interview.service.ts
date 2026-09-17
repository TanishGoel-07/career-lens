import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, InterviewType, QuestionType } from '@career-lens/db';

/**
 * Question bank is curated/deterministic for now (topic + difficulty +
 * expectedConcepts are stored data, not generated per-request) — AI
 * question generation is a documented extension point once a review
 * process for AI-authored questions exists, per architecture §15's
 * "do not depend entirely on LLM evaluation" spirit applied symmetrically
 * to generation.
 */
@Injectable()
export class InterviewService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(userId: string, type: InterviewType) {
    return this.prisma.interviewSession.create({ data: { userId, type } });
  }

  async nextQuestion(userId: string, sessionId: string, topic: string, questionType: QuestionType) {
    const session = await this.prisma.interviewSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new NotFoundException('Interview session not found.');

    // Placeholder deterministic bank lookup; a real QuestionBank
    // repository/seed table is the natural next step, not modeled here
    // to avoid inventing question content that hasn't been curated.
    return this.prisma.interviewQuestion.create({
      data: {
        sessionId,
        topic,
        difficulty: 'medium',
        expectedConcepts: [],
        promptText: `[placeholder] ${topic} question — replace with curated bank lookup`,
        questionType,
      },
    });
  }

  async submitVerbalAnswer(userId: string, questionId: string, rawAnswer: string) {
    const question = await this.prisma.interviewQuestion.findUnique({
      where: { id: questionId },
      include: { session: true },
    });
    if (!question || question.session.userId !== userId) throw new NotFoundException('Question not found.');

    return this.prisma.interviewAnswer.create({
      data: { questionId, rawAnswer },
    });
  }
}
