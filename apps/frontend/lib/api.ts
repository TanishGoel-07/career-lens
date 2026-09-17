export type ResumeEvaluation = { score: number; label: string; strengths: string[]; weaknesses: string[]; formatting: { status: string; details: string }; missingSkills: string[]; suggestions: string[] }
export type EvaluateResumeRequest = { fileName: string }

export interface CareerLensApi { evaluateResume(request: EvaluateResumeRequest): Promise<ResumeEvaluation> }

const mockEvaluation: ResumeEvaluation = { score: 78, label: 'Strong foundation', strengths: ['Clear experience progression', 'Good use of measurable outcomes', 'Relevant technical skills'], weaknesses: ['Summary could be more role-specific', 'Two bullets are longer than recommended'], formatting: { status: 'Good', details: 'Readable hierarchy, consistent dates, and ATS-friendly structure.' }, missingSkills: ['System design', 'Cloud cost optimization'], suggestions: ['Tailor your summary to the target role', 'Add one project that demonstrates system design'] }

export const careerLensApi: CareerLensApi = { async evaluateResume(_request) { await new Promise((resolve) => setTimeout(resolve, 1400)); return mockEvaluation } }
// Replace this adapter with the backend client when the documented contract is available.
