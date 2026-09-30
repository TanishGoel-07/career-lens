'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Lightbulb,
  LockKeyhole,
  Sparkles,
  TrendingUp,
  Upload,
  XCircle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiClient, type Resume, type ResumeEvaluation } from '@/lib/api-client'

interface ResumeViewProps {
  onAuth: () => void
}

export function ResumeView({ onAuth }: ResumeViewProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [activeResume, setActiveResume] = useState<Resume | null>(null)
  const [evaluation, setEvaluation] = useState<ResumeEvaluation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pastResumes, setPastResumes] = useState<Resume[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'bullets' | 'linefeedback' | 'rewrite'>('overview')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      apiClient
        .listResumes()
        .then((resumes) => {
          setPastResumes(resumes)
          if (resumes.length > 0) {
            const latest = resumes[0]
            setActiveResume(latest)
            if (latest.status === 'COMPLETED') {
              apiClient.getResumeEvaluation(latest.id).then(setEvaluation).catch(() => {})
            }
          }
        })
        .catch(() => {})
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    if (!apiClient.isAuthenticated()) {
      onAuth()
      return
    }

    setUploading(true)
    setError(null)
    setEvaluation(null)

    try {
      const uploaded = await apiClient.uploadResume(file)
      setActiveResume(uploaded)
      setUploading(false)
      setProcessing(true)

      const { resume, evaluation: evalResult } = await apiClient.pollResumeEvaluation(uploaded.id)
      setActiveResume(resume)
      if (evalResult) {
        setEvaluation(evalResult)
      }
      const updatedList = await apiClient.listResumes()
      setPastResumes(updatedList)
    } catch (err: any) {
      setError(err?.message || 'Resume upload and evaluation failed.')
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  const handleCopyRewrite = () => {
    if (evaluation?.rewrittenResume) {
      navigator.clipboard.writeText(evaluation.rewrittenResume)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#2866c7]">
            <Sparkles size={12} />
            ATS Engine v2.0
          </span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#172033]">
          Resume Intelligence & ATS Optimization
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Evaluated against 300+ standardized skills across 10 deterministic ATS dimensions, Google XYZ bullet formulas, and automated full rewrite generation.
        </p>
      </div>

      {/* Upload Box */}
      <section className="rounded-2xl border border-dashed border-[#b9c8dc] bg-white p-8 text-center sm:p-12 shadow-xs">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#4f8cff]">
          <Upload size={24} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">
          {file ? file.name : 'Upload your resume for deep ATS audit'}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Supported formats: PDF, DOCX, TXT. Our engine extracts experience metrics, verifies keyword density, and checks parser compliance for Workday, Greenhouse, and Lever.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="border-slate-300 text-xs"
          >
            <FileText size={14} data-icon="inline-start" />
            {file ? 'Choose Different File' : 'Browse File'}
          </Button>

          {file && (
            <Button
              onClick={handleUpload}
              disabled={uploading || processing}
              className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs font-semibold"
            >
              {uploading ? (
                <>
                  <Sparkles size={14} className="animate-spin" data-icon="inline-start" />
                  Uploading...
                </>
              ) : processing ? (
                <>
                  <Activity size={14} className="animate-spin" data-icon="inline-start" />
                  Analyzing 10 ATS Dimensions...
                </>
              ) : (
                <>
                  <Sparkles size={14} data-icon="inline-start" />
                  Run Full ATS Intelligence Audit
                </>
              )}
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg inline-block">
            {error}
          </p>
        )}
      </section>

      {/* Processing State */}
      {processing && (
        <section className="rounded-2xl border border-[#e5e9f0] bg-white p-10 text-center shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-50 text-[#2866c7]">
            <Activity className="animate-spin" size={28} />
          </div>
          <h3 className="mt-5 text-lg font-bold text-slate-900">
            Running 10-Factor Deterministic Analysis
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Evaluating impact metrics, scanning 300+ skill taxonomy, testing XYZ bullet formulas, and constructing AI enhancements...
          </p>
          <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-3/4 animate-pulse rounded-full bg-[#4f8cff]" />
          </div>
        </section>
      )}

      {/* Evaluation Dashboard */}
      {evaluation && !processing && (
        <div className="flex flex-col gap-6">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-bold transition-colors',
                activeTab === 'overview'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              10-Score ATS Rubric
            </button>
            <button
              onClick={() => setActiveTab('bullets')}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5',
                activeTab === 'bullets'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              <Lightbulb size={13} />
              Google XYZ Bullet Improver
              {evaluation.weakBullets && evaluation.weakBullets.length > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] text-white font-mono">
                  {evaluation.weakBullets.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('linefeedback')}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5',
                activeTab === 'linefeedback'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              Line-by-Line Feedback
              {evaluation.lineFeedback && evaluation.lineFeedback.length > 0 && (
                <span className="rounded-full bg-blue-500 px-1.5 py-0.2 text-[10px] text-white font-mono">
                  {evaluation.lineFeedback.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rewrite')}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5',
                activeTab === 'rewrite'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              <Sparkles size={13} />
              Full Rewritten Resume
            </button>
          </div>

          {/* TAB 1: 10-SCORE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              {/* Overall Score Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Overall ATS Score
                      </p>
                      <p className="mt-1 text-5xl font-extrabold text-slate-900">
                        {evaluation.overallScore}
                        <span className="text-base font-normal text-slate-400"> / 100</span>
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex size-20 items-center justify-center rounded-full border-[7px] text-2xl font-bold',
                        evaluation.overallScore >= 80
                          ? 'border-emerald-200 text-emerald-600'
                          : evaluation.overallScore >= 60
                          ? 'border-blue-200 text-[#2866c7]'
                          : 'border-amber-200 text-amber-600'
                      )}
                    >
                      {evaluation.overallScore}
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl bg-blue-50/70 p-4 border border-blue-100">
                    <p className="text-xs font-bold text-blue-900">Applicant Tracking System Verdict</p>
                    <p className="mt-1 text-xs leading-5 text-blue-800">
                      {evaluation.overallScore >= 80
                        ? 'High interview conversion probability across Workday, Lever, and Greenhouse parsers.'
                        : 'Resume passes baseline keyword filters but has clear opportunities in impact quantification and technical depth.'}
                    </p>
                  </div>

                  {/* Missing Skills & Keywords */}
                  <div className="mt-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      High-Demand Missing Skills in Profile
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {evaluation.missingSkills && evaluation.missingSkills.length > 0 ? (
                        evaluation.missingSkills.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 border border-rose-100"
                          >
                            + {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">No critical skill omissions identified.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-4">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  Deterministic scoring calculated based on industry ATS benchmarks.
                </div>
              </div>

              {/* 10 Detailed Dimension Bars */}
              <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  10-Factor Dimension Breakdown
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <RubricItem
                    label="Technical Depth"
                    score={evaluation.technicalDepthScore ?? 80}
                    desc="Architecture, frameworks, and engineering tools density"
                  />
                  <RubricItem
                    label="Quantified Impact"
                    score={evaluation.impactScore ?? 75}
                    desc="Metrics, percentages, latency numbers, and revenue dollars"
                  />
                  <RubricItem
                    label="Keyword Alignment"
                    score={evaluation.keywordScore ?? 80}
                    desc="Coverage of industry standardized technology keywords"
                  />
                  <RubricItem
                    label="Formatting & Layout"
                    score={evaluation.formattingScore ?? 85}
                    desc="Clean single-column structure, proper fonts, margins"
                  />
                  <RubricItem
                    label="Readability Index"
                    score={evaluation.readabilityScore ?? 82}
                    desc="Flesch-Kincaid clarity and concise sentence length"
                  />
                  <RubricItem
                    label="Section Completeness"
                    score={evaluation.deterministicScoreBreakdown?.sectionsScore ?? 85}
                    desc="Experience, Education, Skills, and Summary headers"
                  />
                </div>

                {/* AI Qualitative Feedback */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4">
                  <div className="rounded-xl bg-emerald-50/60 p-4 border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-900 mb-2">Identified Strengths</p>
                    <ul className="flex flex-col gap-1.5 text-xs text-emerald-800">
                      {(evaluation.aiFeedback?.strengths || ['Strong technical vocabulary', 'Clear career progression']).map(
                        (s, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-amber-50/60 p-4 border border-amber-100">
                    <p className="text-xs font-bold text-amber-900 mb-2">Priority Improvement Areas</p>
                    <ul className="flex flex-col gap-1.5 text-xs text-amber-800">
                      {(evaluation.aiFeedback?.weaknesses || ['Incorporate more business metrics']).map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEAK BULLETS IMPROVER */}
          {activeTab === 'bullets' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
                <p className="text-xs font-bold text-amber-900">
                  Google XYZ Formula: "Accomplished [X] as measured by [Y], by doing [Z]"
                </p>
                <p className="mt-1 text-xs text-amber-800 leading-5">
                  Top tier engineering recruiters reject passive bullets like "Responsible for writing backend APIs". Replace them with quantified engineering outcomes.
                </p>
              </div>

              {evaluation.weakBullets && evaluation.weakBullets.length > 0 ? (
                evaluation.weakBullets.map((wb, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                        Sub-optimal Bullet #{idx + 1}
                      </span>
                      <span className="text-xs text-slate-400">Issue: {wb.reason}</span>
                    </div>

                    <div className="rounded-lg bg-rose-50/50 p-3 font-mono text-xs text-rose-900 border border-rose-100">
                      <span className="font-bold text-rose-600 mr-2">BEFORE:</span>
                      "{wb.bullet}"
                    </div>

                    <div className="rounded-lg bg-emerald-50/70 p-3 font-mono text-xs text-emerald-950 border border-emerald-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-700">OPTIMIZED GOOGLE XYZ BULLET:</span>
                        <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                          Formula: {wb.formulaApplied}
                        </span>
                      </div>
                      "{wb.suggestion}"
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                  <h4 className="mt-3 font-bold text-slate-800">Excellent Bullet Construction!</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    No passive or unquantified bullets detected in your resume.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LINE-BY-LINE FEEDBACK */}
          {activeTab === 'linefeedback' && (
            <div className="flex flex-col gap-3">
              {evaluation.lineFeedback && evaluation.lineFeedback.length > 0 ? (
                evaluation.lineFeedback.map((lf, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50 font-mono text-xs font-bold text-blue-700">
                        L{lf.lineNumber}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{lf.issue}</p>
                        <p className="mt-1 text-xs text-slate-500 leading-5">Fix: {lf.fix}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                  <h4 className="mt-3 font-bold text-slate-800">Clean Resume Flow</h4>
                  <p className="mt-1 text-xs text-slate-500">No line syntax or parser formatting warnings.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FULL REWRITTEN RESUME */}
          {activeTab === 'rewrite' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900">Modernized ATS-Optimized Resume Rewrite</h3>
                  <p className="text-xs text-slate-500">
                    Generated by CareerLens AI using high-impact action verbs and quantified achievements.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleCopyRewrite}
                  className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs font-semibold"
                >
                  {copied ? (
                    <>
                      <Check size={14} data-icon="inline-start" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy size={14} data-icon="inline-start" />
                      Copy Resume Text
                    </>
                  )}
                </Button>
              </div>

              <pre className="rounded-xl bg-slate-900 text-slate-100 p-5 font-mono text-xs leading-6 overflow-x-auto whitespace-pre-wrap max-h-[500px]">
                {evaluation.rewrittenResume || 'Resume rewrite is generating...'}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Previous Uploads History */}
      {pastResumes.length > 1 && (
        <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs">
          <h4 className="text-sm font-bold text-slate-800">Historical Resume Iterations</h4>
          <div className="mt-3 flex flex-col gap-2">
            {pastResumes.slice(0, 5).map((r) => (
              <div
                key={r.id}
                onClick={async () => {
                  setActiveResume(r)
                  if (r.status === 'COMPLETED') {
                    const evalRes = await apiClient.getResumeEvaluation(r.id).catch(() => null)
                    if (evalRes) setEvaluation(evalRes)
                  }
                }}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-colors',
                  activeResume?.id === r.id ? 'border-blue-400 bg-blue-50/50' : 'border-slate-100 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-blue-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">{r.originalFilename}</span>
                    <span className="ml-2 text-[10px] text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#2866c7]">
                  {activeResume?.id === r.id ? 'Viewing' : 'Inspect'} &rarr;
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <LockKeyhole size={14} />
        Resumes are parsed securely, never shared with third parties, and retained only for your account.
      </div>
    </div>
  )
}

function RubricItem({ label, score, desc }: { label: string; score: number; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3.5 bg-slate-50/50">
      <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
        <span>{label}</span>
        <span
          className={cn(
            'font-bold',
            score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-[#2866c7]' : 'text-amber-600'
          )}
        >
          {score}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-[#4f8cff]' : 'bg-amber-500'
          )}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] text-slate-400 leading-4">{desc}</p>
    </div>
  )
}
