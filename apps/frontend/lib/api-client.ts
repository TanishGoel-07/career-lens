// CareerLens AI — Typed Frontend API Client
// Handles auth tokens, automatic refresh, error normalization, and full backend contracts.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string | null;
  headline: string | null;
  experienceYears: number | null;
  learningPaceHoursPerWeek: number | null;
}

export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  profile?: UserProfile | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ResumeEvaluation {
  id: string;
  resumeId: string;
  overallScore: number;
  deterministicScoreBreakdown: {
    sectionsScore: number;
    keywordScore: number;
    formattingScore: number;
    impactScore: number;
  };
  aiFeedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } | null;
  createdAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  failureReason: string | null;
  parsedText: string | null;
  sections?: Record<string, string> | null;
  extractedSkills?: string[] | null;
  createdAt: string;
  evaluations?: ResumeEvaluation[];
}

export interface Job {
  id: string;
  source: string;
  externalId: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  optionalSkills: string[];
  location: string | null;
  seniority: string | null;
  postedAt: string | null;
}

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  status: 'SAVED' | 'APPLIED' | 'INTERVIEWING' | 'REJECTED' | 'OFFER';
  notes: string | null;
  createdAt: string;
  job: Job;
}

export interface MatchResult {
  overallScore: number;
  matchingSkills: string[];
  missingRequired: string[];
  missingOptional: string[];
  experienceMismatch: {
    expectedYears?: number;
    actualYears?: number;
    gap: number;
  };
  explanation: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  proficiency: number;
  source: 'RESUME' | 'SELF_REPORTED' | 'ASSESSED';
  skill: Skill;
}

export interface RoleSkill {
  id: string;
  roleId: string;
  skillId: string;
  importance: 'REQUIRED' | 'OPTIONAL';
  minProficiency: number;
  skill: Skill;
}

export interface TargetRole {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  roleSkills?: RoleSkill[];
  roadmaps?: Array<{ id: string; status: string }>;
}

export interface SkillGap {
  id?: string;
  skillId: string;
  skillName: string;
  priority: number;
  difficulty: number;
  prerequisitesMet: boolean;
}

export interface RoadmapModule {
  id: string;
  roadmapId: string;
  skillGapId: string | null;
  title: string;
  type: 'MODULE' | 'PRACTICE' | 'PROJECT' | 'ASSESSMENT';
  orderIndex: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  resources?: unknown;
  completedAt: string | null;
}

export interface Roadmap {
  id: string;
  userId: string;
  targetRoleId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  generatedFrom: { hoursPerWeek: number; gapCount: number };
  createdAt: string;
  modules: RoadmapModule[];
}

export interface InterviewTestCase {
  input: string;
  expectedOutput: string;
}

export interface InterviewQuestion {
  id: string;
  sessionId: string;
  topic: string;
  difficulty: string;
  expectedConcepts: string[];
  promptText: string;
  questionType: 'CODING' | 'VERBAL';
  testCases?: InterviewTestCase[] | null;
  answers?: InterviewAnswer[];
  codeSubmissions?: CodeSubmission[];
}

export interface InterviewAnswer {
  id: string;
  questionId: string;
  rawAnswer: string;
  deterministicResult?: { coveredConcepts: string[]; totalConcepts: number };
  aiEvaluation?: unknown;
  score: number | null;
  createdAt: string;
}

export interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  durationMs: number;
}

export interface CodeSubmission {
  id: string;
  interviewQuestionId: string;
  userId: string;
  language: 'PYTHON' | 'CPP' | 'JAVA';
  sourceCode: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  testResults?: {
    cases: TestCaseResult[];
    compileError?: string | null;
    passedCount: number;
    totalCount: number;
  } | null;
  submittedAt: string;
  completedAt: string | null;
}

export interface InterviewSession {
  id: string;
  userId: string;
  type: 'TECHNICAL' | 'HR' | 'BEHAVIORAL' | 'SYSTEM_DESIGN';
  status: string;
  startedAt: string;
  completedAt: string | null;
  questions?: InterviewQuestion[];
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('cl_access_token');
      this.refreshToken = localStorage.getItem('cl_refresh_token');
    }
  }

  public setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cl_access_token', access);
      localStorage.setItem('cl_refresh_token', refresh);
    }
  }

  public clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cl_access_token');
      localStorage.removeItem('cl_refresh_token');
    }
  }

  public isAuthenticated(): boolean {
    return Boolean(this.accessToken);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryAuth = true,
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkErr) {
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        'Could not connect to CareerLens server. Please ensure the API is running.',
      );
    }

    // Attempt token rotation on 401
    if (response.status === 401 && retryAuth && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options, false);
      } else {
        this.clearTokens();
      }
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const code = data?.error?.code || 'ERROR';
      const message =
        data?.error?.message ||
        data?.message ||
        `Request failed with status ${response.status}`;
      const details = data?.error?.details || data?.error;
      const requestId = data?.requestId;
      throw new ApiClientError(response.status, code, message, details, requestId);
    }

    return data;
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (res.ok) {
        const data: AuthTokens = await res.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    } catch {
      // Refresh network failure
    }
    return false;
  }

  // --- Auth Endpoints --------------------------------------------------------
  async register(email: string, password: string): Promise<{ userId: string }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const tokens = await this.request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch {
        // Ignore logout errors
      }
    }
    this.clearTokens();
  }

  async logoutAll(): Promise<void> {
    try {
      await this.request('/auth/logout-all', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  // --- Users Endpoints -------------------------------------------------------
  async getMe(): Promise<User> {
    return this.request('/users/me');
  }

  async updateProfile(profile: {
    fullName?: string;
    headline?: string;
    experienceYears?: number;
    learningPaceHoursPerWeek?: number;
  }): Promise<UserProfile> {
    return this.request('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    });
  }

  // --- Resumes Endpoints -----------------------------------------------------
  async uploadResume(file: File): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/resumes', {
      method: 'POST',
      body: formData,
    });
  }

  async listResumes(): Promise<Resume[]> {
    return this.request('/resumes');
  }

  async getResume(id: string): Promise<Resume> {
    return this.request(`/resumes/${id}`);
  }

  async getResumeEvaluation(id: string): Promise<ResumeEvaluation> {
    return this.request(`/resumes/${id}/evaluation`);
  }

  async pollResumeEvaluation(
    resumeId: string,
    maxRetries = 20,
    intervalMs = 1500,
  ): Promise<{ resume: Resume; evaluation?: ResumeEvaluation }> {
    for (let i = 0; i < maxRetries; i++) {
      const resume = await this.getResume(resumeId);
      if (resume.status === 'COMPLETED') {
        try {
          const evaluation = await this.getResumeEvaluation(resumeId);
          return { resume, evaluation };
        } catch {
          return { resume };
        }
      }
      if (resume.status === 'FAILED') {
        throw new Error(resume.failureReason || 'Resume processing failed.');
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    const finalResume = await this.getResume(resumeId);
    return { resume: finalResume };
  }

  // --- Jobs & Matching Endpoints ---------------------------------------------
  async searchJobs(
    q?: string,
    location?: string,
    cursor?: string,
  ): Promise<{ data: Job[]; meta: { nextCursor: string | null } }> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (location) params.set('location', location);
    if (cursor) params.set('cursor', cursor);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/jobs${query}`);
  }

  async getJob(id: string): Promise<Job> {
    return this.request(`/jobs/${id}`);
  }

  async saveJob(
    jobId: string,
    status: 'SAVED' | 'APPLIED' | 'INTERVIEWING' | 'REJECTED' | 'OFFER',
    notes?: string,
  ): Promise<SavedJob> {
    return this.request(`/jobs/${jobId}/save`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  }

  async listSavedJobs(): Promise<SavedJob[]> {
    return this.request('/jobs/saved/mine');
  }

  async getMatch(resumeId: string, jobId: string): Promise<MatchResult> {
    return this.request(`/matches/${resumeId}/${jobId}`);
  }

  // --- Skills & Target Roles Endpoints ---------------------------------------
  async addUserSkill(skillName: string): Promise<UserSkill> {
    return this.request('/skills/mine', {
      method: 'POST',
      body: JSON.stringify({ skillName }),
    });
  }

  async listUserSkills(): Promise<UserSkill[]> {
    return this.request('/skills/mine');
  }

  async listTargetRoles(): Promise<TargetRole[]> {
    return this.request('/target-roles');
  }

  async createTargetRole(
    title: string,
    skills?: Array<{ name: string; importance?: 'REQUIRED' | 'OPTIONAL'; minProficiency?: number }>,
  ): Promise<TargetRole> {
    return this.request('/target-roles', {
      method: 'POST',
      body: JSON.stringify({ title, skills }),
    });
  }

  async addRoleSkills(
    roleId: string,
    skills: Array<{ name: string; importance?: 'REQUIRED' | 'OPTIONAL'; minProficiency?: number }>,
  ): Promise<TargetRole> {
    return this.request(`/target-roles/${roleId}/skills`, {
      method: 'POST',
      body: JSON.stringify({ skills }),
    });
  }

  async getSkillGaps(targetRoleId: string): Promise<SkillGap[]> {
    return this.request(`/target-roles/${targetRoleId}/skill-gaps`);
  }

  // --- Roadmap Endpoints -----------------------------------------------------
  async generateRoadmap(targetRoleId: string, hoursPerWeek: number): Promise<Roadmap> {
    return this.request(`/target-roles/${targetRoleId}/roadmap`, {
      method: 'POST',
      body: JSON.stringify({ hoursPerWeek }),
    });
  }

  async listMyRoadmaps(): Promise<Roadmap[]> {
    return this.request('/roadmaps/mine');
  }

  async updateModuleStatus(
    moduleId: string,
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
  ): Promise<RoadmapModule> {
    return this.request(`/roadmap-modules/${moduleId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // --- Coach Endpoints -------------------------------------------------------
  async sendCoachMessage(
    sessionId: string,
    message: string,
  ): Promise<{ reply: { text: string } }> {
    return this.request('/coach/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    });
  }

  // --- Interview & Practice Endpoints ----------------------------------------
  async startInterviewSession(
    type: 'TECHNICAL' | 'HR' | 'BEHAVIORAL' | 'SYSTEM_DESIGN',
  ): Promise<InterviewSession> {
    return this.request('/interview/sessions', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async listInterviewSessions(): Promise<InterviewSession[]> {
    return this.request('/interview/sessions');
  }

  async getInterviewSession(id: string): Promise<InterviewSession> {
    return this.request(`/interview/sessions/${id}`);
  }

  async nextInterviewQuestion(
    sessionId: string,
    topic: string,
    questionType: 'CODING' | 'VERBAL',
  ): Promise<InterviewQuestion> {
    return this.request(`/interview/sessions/${sessionId}/next-question`, {
      method: 'POST',
      body: JSON.stringify({ topic, questionType }),
    });
  }

  async submitVerbalAnswer(
    questionId: string,
    rawAnswer: string,
  ): Promise<InterviewAnswer> {
    return this.request(`/interview/questions/${questionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ rawAnswer }),
    });
  }

  // --- Code Execution Submissions --------------------------------------------
  async submitCode(
    interviewQuestionId: string,
    language: 'PYTHON' | 'CPP' | 'JAVA',
    sourceCode: string,
  ): Promise<CodeSubmission> {
    return this.request('/submissions', {
      method: 'POST',
      body: JSON.stringify({ interviewQuestionId, language, sourceCode }),
    });
  }

  async getCodeSubmission(id: string): Promise<CodeSubmission> {
    return this.request(`/submissions/${id}`);
  }

  async pollSubmissionResult(
    submissionId: string,
    maxRetries = 15,
    intervalMs = 1200,
  ): Promise<CodeSubmission> {
    for (let i = 0; i < maxRetries; i++) {
      const submission = await this.getCodeSubmission(submissionId);
      if (
        submission.status === 'COMPLETED' ||
        submission.status === 'FAILED' ||
        submission.status === 'TIMEOUT'
      ) {
        return submission;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return this.getCodeSubmission(submissionId);
  }

  // --- Health Checks ---------------------------------------------------------
  async getHealth(): Promise<{ status: string }> {
    return this.request('/health');
  }

  async getReadiness(): Promise<{ ready: boolean; checks: Record<string, boolean> }> {
    return this.request('/readiness');
  }
}

export const apiClient = new ApiClient();
