'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileCheck2,
  FileText,
  LockKeyhole,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react'
import { GithubIcon } from '@/components/ui/github-icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiClient, type UserAnalyticsSummary } from '@/lib/api-client'

interface OverviewViewProps {
  go: (view: 'overview' | 'resume' | 'jobs' | 'skills' | 'roadmap' | 'assistant' | 'practice' | 'github' | 'interview') => void
  onAuth: () => void
  isAuth: boolean
}

export function OverviewView({ go, onAuth, isAuth }: OverviewViewProps) {
  const [analytics, setAnalytics] = useState<UserAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuth) {
      setLoading(true)
      apiClient
        .getUserAnalytics()
        .then((data) => setAnalytics(data))
        .catch((err) => console.error('Failed to load user analytics', err))
        .finally(() => setLoading(false))
    }
  }, [isAuth])

  const atsScore = analytics?.currentAtsScore ?? 0
  const roadmapPct = analytics?.roadmapVelocity.completionPercentage ?? 0
  const solvedCount = analytics?.codingPerformance.totalSolved ?? 0
  const nextAction = analytics?.dynamicNextBestAction ?? {
    title: 'Upload your latest resume to establish baseline ATS intelligence',
    description: 'Run our deterministic and AI evaluation to uncover high-impact keyword and formatting opportunities.',
    targetView: 'resume' as const,
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Section */}
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#2866c7]">
              <Sparkles size={12} />
              AI-Powered Career Intelligence
            </span>
          </div>
          <h2 className="max-w-xl text-3xl font-bold tracking-tight text-[#172033]">
            Elevate your career trajectory with quantified intelligence.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            CareerLens AI combines deep resume ATS scoring, topological skill graphs, real sandboxed DSA coding practice, and GitHub portfolio verification into one unified platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isAuth && (
            <Button variant="outline" onClick={onAuth} className="border-slate-300">
              Sign In
            </Button>
          )}
          <Button onClick={() => go('resume')} className="w-fit bg-[#1e3a5f] hover:bg-[#274b76]">
            <Upload size={15} data-icon="inline-start" />
            Evaluate Resume
          </Button>
        </div>
      </section>

      {/* Primary KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Resume ATS Score
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileText size={17} />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {atsScore > 0 ? `${atsScore}` : '—'}
            <span className="text-sm font-normal text-slate-400"> / 100</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            {atsScore >= 80 ? (
              <span className="text-emerald-600 font-medium">Top 15% ATS ready</span>
            ) : atsScore > 0 ? (
              <span className="text-amber-600 font-medium">Optimization potential</span>
            ) : (
              <span>Upload resume to evaluate</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Target Skills Coverage
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Target size={17} />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {analytics?.skillProgression ? `${analytics.skillProgression.coveragePercentage}%` : '0%'}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>
              {analytics?.skillProgression
                ? `${analytics.skillProgression.totalSkillsAcquired} verified skills in portfolio`
                : 'Define role to track'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              DSA Problems Solved
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Code2 size={17} />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {solvedCount}
            <span className="text-sm font-normal text-slate-400"> solved</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">Docker sandbox verified</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              GitHub Profile Score
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <GithubIcon size={17} />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {analytics?.githubIntelligence ? `${analytics.githubIntelligence.profileScore}` : '—'}
            <span className="text-sm font-normal text-slate-400"> / 100</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            {analytics?.githubIntelligence ? (
              <span className="text-indigo-600 font-medium">
                {analytics.githubIntelligence.verifiedSkillsCount} skills verified
              </span>
            ) : (
              <span>Connect GitHub profile</span>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Next Best Action & Quick Actions */}
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dynamic Algorithmic Directive
                </span>
                <h3 className="mt-1 font-semibold text-slate-900 text-lg">Your Next Best Action</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Calculated using real-time topological skill graph unlocks, ATS gap density, and candidate practice telemetry.
                </p>
              </div>
              <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-semibold text-[#2866c7]">
                High Leverage
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-xl bg-[#f7f9fc] p-5 sm:flex-row sm:items-center border border-slate-100">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#4f8cff] shadow-xs">
                <FileCheck2 size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{nextAction.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{nextAction.description}</p>
              </div>
              <Button
                size="sm"
                onClick={() => go(nextAction.targetView)}
                className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs font-semibold"
              >
                Execute Action <ChevronRight size={14} data-icon="inline-end" />
              </Button>
            </div>
          </div>

          {/* Historical ATS Score Trend Chart */}
          {analytics?.atsScoreTrends && analytics.atsScoreTrends.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  ATS Score Progression Trend
                </h4>
                <span className="text-xs text-slate-400">
                  {analytics.atsScoreTrends.length} evaluations logged
                </span>
              </div>
              <div className="flex items-end gap-3 h-24 pt-2">
                {analytics.atsScoreTrends.slice(-7).map((t, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-700">{t.score}</span>
                    <div
                      className="w-full bg-[#4f8cff] rounded-t-sm transition-all hover:bg-[#2866c7]"
                      style={{ height: `${Math.max(15, (t.score / 100) * 100)}%` }}
                      title={`${t.filename}: ${t.score} on ${t.date}`}
                    />
                    <span className="text-[9px] text-slate-400 truncate max-w-[45px]">{t.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Feature Hub */}
        <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Platform Capabilities</h3>
            <span className="text-xs text-slate-400">6 Specialized Modules</span>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              onClick={() => go('resume')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-blue-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">10-Factor ATS Resume Intelligence</p>
                  <p className="text-[11px] text-slate-500">Google XYZ bullet improver & full rewritten resume</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>

            <button
              onClick={() => go('practice')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Code2 size={18} className="text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Coding Practice Platform</p>
                  <p className="text-[11px] text-slate-500">LeetCode problems, progressive AI hints & debugger</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>

            <button
              onClick={() => go('interview')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">AI Mock Interview Simulator</p>
                  <p className="text-[11px] text-slate-500">Technical, Behavioral STAR & System Design</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>

            <button
              onClick={() => go('github')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GithubIcon size={18} className="text-slate-800" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">GitHub Intelligence & Skills Verification</p>
                  <p className="text-[11px] text-slate-500">Portfolio quality analysis & verified skill badges</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>

            <button
              onClick={() => go('jobs')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BriefcaseBusiness size={18} className="text-[#2866c7]" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Semantic Job Matching</p>
                  <p className="text-[11px] text-slate-500">Pgvector embeddings & custom improvement plans</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>

            <button
              onClick={() => go('assistant')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bot size={18} className="text-violet-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Career Copilot & Goal Assessment</p>
                  <p className="text-[11px] text-slate-500">Multi-turn strategy, goal audits & RAG Q&A</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <LockKeyhole size={14} />
        Your career data is private, encrypted, and evaluated using deterministic algorithms and verified AI models.
      </div>
    </div>
  )
}
