export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type Role = 'USER' | 'ADMIN';

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserPublicDto {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface ResumeDto {
  id: string;
  originalFilename: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface ResumeEvaluationDto {
  overallScore: number;
  deterministicScoreBreakdown: Record<string, number>;
  aiFeedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } | null;
}

export interface JobMatchDto {
  jobId: string;
  overallScore: number;
  matchingSkills: string[];
  missingRequired: string[];
  missingOptional: string[];
  explanation: string;
}

export interface SkillGapDto {
  skillId: string;
  skillName: string;
  priority: number;
  difficulty: number;
  prerequisitesMet: boolean;
}

export interface RoadmapModuleDto {
  id: string;
  title: string;
  type: 'MODULE' | 'PRACTICE' | 'PROJECT' | 'ASSESSMENT';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  orderIndex: number;
}
