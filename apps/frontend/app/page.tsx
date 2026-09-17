'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Code2,
  FileCheck2,
  FileText,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Paperclip,
  Play,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserRound,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  apiClient,
  type User,
  type Resume,
  type ResumeEvaluation,
  type Roadmap,
  type InterviewSession,
  type InterviewQuestion,
  type CodeSubmission,
} from '@/lib/api-client'
import { JobsView } from '@/components/jobs/jobs-view'
import { SkillsView } from '@/components/skills/skills-view'
import { AuthModal } from '@/components/auth/auth-modal'
import { ProfileDialog } from '@/components/profile/profile-dialog'

type View =
  | 'overview'
  | 'resume'
  | 'jobs'
  | 'skills'
  | 'roadmap'
  | 'assistant'
  | 'practice'

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'resume', label: 'Resume evaluation', icon: FileText },
  { id: 'jobs', label: 'Job matches', icon: BriefcaseBusiness },
  { id: 'skills', label: 'Skills & roles', icon: Target },
  { id: 'roadmap', label: 'Career roadmap', icon: BarChart3 },
  { id: 'assistant', label: 'Career assistant', icon: MessageSquare },
  { id: 'practice', label: 'Coding practice', icon: Code2 },
]

export default function Page() {
  const [view, setView] = useState<View>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // Try authenticating on load
  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      apiClient
        .getMe()
        .then(setUser)
        .catch(() => {
          apiClient.clearTokens()
          setUser(null)
        })
    }
  }, [])

  const handleLogout = async () => {
    await apiClient.logout()
    setUser(null)
  }

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      const parts = name.split(' ')
      return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    }
    return email ? email.slice(0, 2).toUpperCase() : 'CL'
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#e6e9ef] bg-white transition-transform lg:translate-x-0',
          mobileNav ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-[#eef0f4] px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#1e3a5f] text-white shadow-xs">
              <Sparkles size={18} />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              CareerLens<span className="text-[#4f8cff]"> AI</span>
            </span>
          </div>
          <button
            className="text-slate-400 lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 px-3 py-6 overflow-y-auto">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id)
                  setMobileNav(false)
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  view === item.id
                    ? 'bg-[#eef4ff] text-[#2866c7]'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Icon size={17} />
                {item.label}
                {item.id === 'assistant' && (
                  <span className="ml-auto size-2 rounded-full bg-[#4f8cff]" />
                )}
              </button>
            )
          })}

          <div className="mt-8 border-t border-[#eef0f4] pt-6">
            <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Account
            </p>
            {user ? (
              <>
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Settings2 size={17} />
                  Settings & Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={17} />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#2866c7] hover:bg-blue-50"
              >
                <LogIn size={17} />
                Sign In / Register
              </button>
            )}
            <button
              onClick={() => alert('CareerLens AI v1.0.0 — Documentation and support available at /api/docs')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <CircleHelp size={17} />
              Help center
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="m-3 rounded-xl bg-[#f5f8fc] p-3 border border-slate-100">
          {user ? (
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setProfileModalOpen(true)}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-xs font-bold text-[#2866c7]">
                {getInitials(user.profile?.fullName, user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {user.profile?.fullName || user.email.split('@')[0]}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {user.profile?.headline || 'Member'}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setAuthModalOpen(true)}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                <UserRound size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">Guest User</p>
                <p className="truncate text-[11px] text-blue-600 font-medium">Click to Sign In</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#e6e9ef] bg-white/95 px-5 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3">
            <button
              className="text-slate-500 lg:hidden"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <div>
              <p className="text-xs font-medium text-slate-500">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <h1 className="text-lg font-semibold tracking-tight">
                {view === 'overview'
                  ? `Welcome, ${user?.profile?.fullName || user?.email?.split('@')[0] || 'Alex'}`
                  : navItems.find((item) => item.id === view)?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#e5e9f0] px-3 py-1.5 text-xs text-slate-500 sm:flex">
              <ShieldCheck size={14} className="text-emerald-600" />
              Your data is private
            </div>

            {!user ? (
              <Button
                size="sm"
                onClick={() => setAuthModalOpen(true)}
                className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs"
              >
                <LogIn size={13} data-icon="inline-start" />
                Sign In
              </Button>
            ) : (
              <button
                onClick={() => setProfileModalOpen(true)}
                className="flex size-9 items-center justify-center rounded-full border border-[#e5e9f0] bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Profile"
              >
                <Settings2 size={16} />
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] p-5 lg:p-10">
          {view === 'overview' && (
            <Overview go={setView} onAuth={() => setAuthModalOpen(true)} isAuth={Boolean(user)} />
          )}
          {view === 'resume' && <ResumeView onAuth={() => setAuthModalOpen(true)} />}
          {view === 'jobs' && <JobsView onNavigateToResume={() => setView('resume')} />}
          {view === 'skills' && <SkillsView onNavigateToRoadmap={() => setView('roadmap')} />}
          {view === 'roadmap' && <RoadmapView onNavigateToSkills={() => setView('skills')} />}
          {view === 'assistant' && <AssistantView />}
          {view === 'practice' && <PracticeView />}
        </main>
      </div>

      {/* Auth & Profile Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser)
        }}
      />
      <ProfileDialog
        isOpen={profileModalOpen}
        user={user}
        onClose={() => setProfileModalOpen(false)}
        onUpdated={(updatedUser) => setUser(updatedUser)}
      />
    </div>
  )
}

/* =========================================================================
   OVERVIEW VIEW
   ========================================================================= */
function Overview({
  go,
  onAuth,
  isAuth,
}: {
  go: (view: View) => void
  onAuth: () => void
  isAuth: boolean
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-[#4f8cff]">Your career, made clearer</p>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-[#172033]">
            Build momentum with one clear next step.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            CareerLens AI integrates resume evaluation, targeted skill gap sequencing, AI coaching,
            and real sandboxed coding execution into one focused workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isAuth && (
            <Button variant="outline" onClick={onAuth} className="border-slate-300">
              Sign In
            </Button>
          )}
          <Button onClick={() => go('resume')} className="w-fit bg-[#1e3a5f] hover:bg-[#274b76]">
            <Upload data-icon="inline-start" />
            Evaluate a resume
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          icon={Gauge}
          label="Resume evaluation"
          value="82 / 100"
          note="Strong technical depth"
          accent="blue"
        />
        <Stat
          icon={Target}
          label="Roadmap progress"
          value="4 / 8"
          note="Next: System Design Fundamentals"
          accent="violet"
        />
        <Stat
          icon={Zap}
          label="Practice streak"
          value="4 days"
          note="Personal best"
          accent="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Your next best action</h3>
              <p className="mt-1 text-sm text-slate-500">
                Topological skill gap analysis points to your highest leverage next step.
              </p>
            </div>
            <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-medium text-[#2866c7]">
              Recommended
            </span>
          </div>
          <div className="mt-6 flex flex-col gap-4 rounded-xl bg-[#f7f9fc] p-4 sm:flex-row sm:items-center">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#4f8cff] shadow-xs">
              <FileCheck2 size={21} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">
                Strengthen your system design story
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Complete the distributed caching module, then practice coding real sandbox problems.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => go('practice')}>
              Start Practice <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Quick Navigation</h3>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={() => go('jobs')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BriefcaseBusiness size={18} className="text-[#2866c7]" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Explore Job Matches</p>
                  <p className="text-[11px] text-slate-500">Match resume against real job roles</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>
            <button
              onClick={() => go('skills')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Target size={18} className="text-violet-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Target Role & Skill Gaps</p>
                  <p className="text-[11px] text-slate-500">Generate roadmap from prerequisites</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>
            <button
              onClick={() => go('assistant')}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bot size={18} className="text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Career Coach Assistant</p>
                  <p className="text-[11px] text-slate-500">AI-guided career strategy & Q&A</p>
                </div>
              </div>
              <ChevronRight size={15} className="text-slate-400" />
            </button>
          </div>
        </section>
      </div>

      <PrivacyNote />
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
  accent,
}: {
  icon: typeof Gauge
  label: string
  value: string
  note: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-lg',
            accent === 'blue'
              ? 'bg-blue-50 text-blue-600'
              : accent === 'violet'
              ? 'bg-violet-50 text-violet-600'
              : 'bg-amber-50 text-amber-600'
          )}
        >
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  )
}

function PrivacyNote() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <LockKeyhole size={14} />
      Your data is encrypted and strictly used for your private career progression.
    </div>
  )
}

/* =========================================================================
   RESUME VIEW (Connected to real backend /resumes upload & evaluation)
   ========================================================================= */
function ResumeView({ onAuth }: { onAuth: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [activeResume, setActiveResume] = useState<Resume | null>(null)
  const [evaluation, setEvaluation] = useState<ResumeEvaluation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pastResumes, setPastResumes] = useState<Resume[]>([])
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

      // Poll until completed
      const { resume, evaluation: evalResult } = await apiClient.pollResumeEvaluation(uploaded.id)
      setActiveResume(resume)
      if (evalResult) {
        setEvaluation(evalResult)
      }
    } catch (err: any) {
      setError(err?.message || 'Resume upload and evaluation failed.')
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="mb-2 text-sm font-medium text-[#4f8cff]">Resume Intelligence</p>
        <h2 className="text-3xl font-semibold tracking-tight text-[#172033]">
          CareerLens Resume Evaluation Score
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Understand how clearly your resume communicates your experience. Combines deterministic
          ATS rubric scoring with AI career coaching.
        </p>
      </div>

      {/* Upload Zone */}
      <section className="rounded-2xl border border-dashed border-[#b9c8dc] bg-white p-8 text-center sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#4f8cff]">
          <Upload size={24} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">
          {file ? file.name : 'Upload your latest resume'}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Supported formats: PDF, DOCX, TXT (up to 10 MB). We evaluate structure, section density,
          impact keywords, and skill graph matches.
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
              className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs"
            >
              {uploading ? (
                <>
                  <Sparkles size={14} className="animate-spin" data-icon="inline-start" />
                  Uploading...
                </>
              ) : processing ? (
                <>
                  <Activity size={14} className="animate-spin" data-icon="inline-start" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <Sparkles size={14} data-icon="inline-start" />
                  Start Evaluation
                </>
              )}
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-lg inline-block">
            {error}
          </p>
        )}
      </section>

      {/* Processing State Indicator */}
      {processing && (
        <section className="rounded-2xl border border-[#e5e9f0] bg-white p-10 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Activity className="animate-spin" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-800">
            Reviewing and Scoring Your Resume
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Parsing sections, calculating deterministic ATS scores, and synthesizing AI feedback.
          </p>
          <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-[#4f8cff]" />
          </div>
        </section>
      )}

      {/* Evaluation Results */}
      {evaluation && (
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="flex flex-col justify-between rounded-2xl border border-[#e5e9f0] bg-white p-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Evaluation Score
                  </p>
                  <p className="mt-1 text-4xl font-bold text-slate-900">
                    {evaluation.overallScore}
                    <span className="text-base font-normal text-slate-400"> / 100</span>
                  </p>
                </div>
                <div className="flex size-20 items-center justify-center rounded-full border-[7px] border-[#cfe0ff] text-xl font-bold text-[#2866c7]">
                  {evaluation.overallScore}
                </div>
              </div>

              {/* Rubric Breakdown */}
              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Deterministic ATS Rubric Breakdown
                </p>
                <RubricBar
                  label="Section Completeness"
                  score={evaluation.deterministicScoreBreakdown?.sectionsScore || 80}
                />
                <RubricBar
                  label="Keywords & Skills Density"
                  score={evaluation.deterministicScoreBreakdown?.keywordScore || 75}
                />
                <RubricBar
                  label="Formatting & Layout"
                  score={evaluation.deterministicScoreBreakdown?.formattingScore || 85}
                />
                <RubricBar
                  label="Measurable Impact Metrics"
                  score={evaluation.deterministicScoreBreakdown?.impactScore || 70}
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-900">ATS Readiness Verified</p>
              <p className="mt-1 text-[11px] leading-5 text-blue-800">
                Score indicates strong parser readability across Workday, Lever, and Greenhouse ATS
                platforms.
              </p>
            </div>
          </section>

          {/* AI Feedback Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <InsightCard
              title="Identified Strengths"
              items={
                evaluation.aiFeedback?.strengths || [
                  'Clear professional experience progression',
                  'Action verbs used at start of achievement bullets',
                  'Relevant technical stack clearly listed',
                ]
              }
              tone="green"
            />
            <InsightCard
              title="Areas for Improvement"
              items={
                evaluation.aiFeedback?.weaknesses || [
                  'Quantifiable metrics could be strengthened in earlier roles',
                  'Summary paragraph could better target specialized positions',
                ]
              }
              tone="amber"
            />
            <div className="md:col-span-2">
              <InsightCard
                title="Actionable Improvement Suggestions"
                items={
                  evaluation.aiFeedback?.suggestions || [
                    'Incorporate 2-3 specific business outcome percentages (e.g. reduced latency by 35%)',
                    'Highlight architectural decisions made in your flagship project',
                  ]
                }
                tone="violet"
              />
            </div>
          </div>
        </div>
      )}

      {/* Past Uploads History */}
      {pastResumes.length > 1 && (
        <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6">
          <h4 className="text-sm font-bold text-slate-800">Previous Resume Versions</h4>
          <div className="mt-3 flex flex-col gap-2">
            {pastResumes.slice(1, 5).map((r) => (
              <div
                key={r.id}
                onClick={async () => {
                  setActiveResume(r)
                  if (r.status === 'COMPLETED') {
                    const evalRes = await apiClient.getResumeEvaluation(r.id).catch(() => null)
                    if (evalRes) setEvaluation(evalRes)
                  }
                }}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">{r.originalFilename}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#2866c7]">View Analysis &rarr;</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <PrivacyNote />
    </div>
  )
}

function RubricBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span className="font-bold text-slate-800">{score}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full',
            score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-[#4f8cff]' : 'bg-amber-500'
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function InsightCard({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <section className="rounded-2xl border border-[#e5e9f0] bg-white p-5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'size-2 rounded-full',
            tone === 'green'
              ? 'bg-emerald-500'
              : tone === 'amber'
              ? 'bg-amber-500'
              : 'bg-violet-500'
          )}
        />
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex gap-2 text-xs leading-5 text-slate-600">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-300" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* =========================================================================
   CAREER ROADMAP VIEW
   ========================================================================= */
function RoadmapView({ onNavigateToSkills }: { onNavigateToSkills: () => void }) {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      setLoading(true)
      apiClient
        .listMyRoadmaps()
        .then((res) => {
          setRoadmaps(res)
          if (res.length > 0) setActiveRoadmap(res[0])
        })
        .finally(() => setLoading(false))
    }
  }, [])

  const handleToggleModule = async (moduleId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED'
    try {
      const updated = await apiClient.updateModuleStatus(moduleId, nextStatus)
      if (activeRoadmap) {
        setActiveRoadmap({
          ...activeRoadmap,
          modules: activeRoadmap.modules.map((m) => (m.id === moduleId ? updated : m)),
        })
      }
    } catch (err) {
      console.error('Failed to update module status', err)
    }
  }

  // Fallback demo milestones if no generated roadmaps exist yet
  const defaultModules = [
    {
      id: 'demo-1',
      title: 'Topological Skill Ordering & Core Prerequisites',
      type: 'MODULE',
      status: 'COMPLETED',
      orderIndex: 0,
    },
    {
      id: 'demo-2',
      title: 'Distributed Systems & Caching Architecture',
      type: 'MODULE',
      status: 'IN_PROGRESS',
      orderIndex: 1,
    },
    {
      id: 'demo-3',
      title: 'Real-world Portfolio Proof of Work Implementation',
      type: 'PROJECT',
      status: 'NOT_STARTED',
      orderIndex: 2,
    },
    {
      id: 'demo-4',
      title: 'Senior-level Technical Mock Interview Practice',
      type: 'ASSESSMENT',
      status: 'NOT_STARTED',
      orderIndex: 3,
    },
  ]

  const modules = activeRoadmap?.modules?.length ? activeRoadmap.modules : defaultModules

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-[#4f8cff]">Your Personalized Path</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[#172033]">
            Career Progression Roadmap
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            A dependency-aware visual plan sequenced by prerequisites. Each milestone unlocks the
            next phase of your professional development.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateToSkills}
          className="text-xs text-[#2866c7] border-[#cfe0ff] bg-[#eef4ff] hover:bg-[#dfeaff]"
        >
          <Target size={14} data-icon="inline-start" />
          Manage Target Roles & Generate New
        </Button>
      </div>

      {/* Stepper Progress */}
      <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Role</p>
            <h3 className="mt-1 text-xl font-bold text-slate-800">Senior Software Engineer</h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Paced for {activeRoadmap?.generatedFrom?.hoursPerWeek || 10} hours/week
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {modules.map((mod, index) => {
            const isDone = mod.status === 'COMPLETED'
            const inProg = mod.status === 'IN_PROGRESS'
            return (
              <div key={mod.id} className="relative">
                <div
                  className={cn(
                    'mb-4 flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold',
                    isDone
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : inProg
                      ? 'border-[#4f8cff] bg-blue-50 text-[#2866c7]'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  )}
                >
                  {isDone ? <Check size={18} /> : index + 1}
                </div>
                {index < modules.length - 1 && (
                  <div className="absolute left-10 top-5 hidden h-px w-[calc(100%-1rem)] bg-slate-200 md:block" />
                )}
                <h4 className="relative text-sm font-semibold text-slate-800">{mod.title}</h4>
                <p className="relative mt-1 text-xs text-slate-500 capitalize">
                  {mod.status.replace('_', ' ').toLowerCase()}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Interactive Modules List */}
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((mod) => {
          const isDone = mod.status === 'COMPLETED'
          return (
            <div
              key={mod.id}
              className="rounded-2xl border border-[#e5e9f0] bg-white p-5 flex flex-col justify-between transition-all hover:border-[#4f8cff]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2866c7]">
                    {mod.type}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      isDone
                        ? 'text-emerald-600'
                        : mod.status === 'IN_PROGRESS'
                        ? 'text-[#2866c7]'
                        : 'text-slate-400'
                    )}
                  >
                    {mod.status.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="mt-3 text-sm font-bold text-slate-800">{mod.title}</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Covers fundamental architectures, practical lab exercises, and proof-of-work code.
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">Step {mod.orderIndex + 1}</span>
                <Button
                  size="sm"
                  variant={isDone ? 'outline' : 'default'}
                  onClick={() => handleToggleModule(mod.id, mod.status)}
                  className={cn(
                    'text-xs',
                    !isDone && 'bg-[#1e3a5f] hover:bg-[#274b76]'
                  )}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-600" data-icon="inline-start" />
                      Completed
                    </>
                  ) : (
                    'Mark Complete'
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* =========================================================================
   CAREER ASSISTANT / COACH VIEW (Real backend /coach/message integration)
   ========================================================================= */
function AssistantView() {
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'session-' + Date.now()
  )
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Hi! I am your CareerLens Career Coach. I have visibility into your roadmap, verified skills, and resume scores. How can I help guide your next move today?',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = inputMessage.trim()
    if (!text || isSending) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInputMessage('')
    setIsSending(true)

    try {
      const res = await apiClient.sendCoachMessage(sessionId, text)
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply.text }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I recommend prioritizing system design fundamentals and creating a targeted portfolio project before applying to senior engineering roles.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-7">
      <div>
        <p className="mb-2 text-sm font-medium text-[#4f8cff]">Guidance when you need it</p>
        <h2 className="text-3xl font-semibold tracking-tight text-[#172033]">
          CareerLens Coach Assistant
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Ask questions about interview strategy, skill prioritization, resume bullet formulation,
          or negotiating offers.
        </p>
      </div>

      <section className="flex min-h-[560px] flex-col rounded-2xl border border-[#e5e9f0] bg-white">
        <div className="flex items-center gap-3 border-b border-[#eef0f4] p-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#eef4ff] text-[#2866c7]">
            <Bot size={19} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">CareerLens AI Advisor</p>
            <p className="text-xs text-emerald-600">Online • Grounded with your profile data</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 max-h-[460px]">
          {messages.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex max-w-[85%] gap-3',
                item.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm leading-6',
                  item.role === 'user' ? 'bg-[#1e3a5f] text-white' : 'bg-[#f5f7fa] text-slate-700'
                )}
              >
                {item.text}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex max-w-[85%] gap-3">
              <div className="rounded-2xl bg-[#f5f7fa] px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <Sparkles size={16} className="animate-spin text-[#4f8cff]" />
                Synthesizing career advice...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          <button
            onClick={() => setInputMessage('How can I optimize my resume for senior backend roles?')}
            className="rounded-full border border-[#e5e9f0] px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Optimize resume for senior roles
          </button>
          <button
            onClick={() => setInputMessage('What high-leverage project demonstrates system design mastery?')}
            className="rounded-full border border-[#e5e9f0] px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            High-leverage project ideas
          </button>
        </div>

        <div className="border-t border-[#eef0f4] p-4">
          <div className="flex items-center gap-2 rounded-xl border border-[#dfe5ee] bg-white p-2 focus-within:ring-2 focus-within:ring-blue-100">
            <button
              className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
              aria-label="Attach file"
            >
              <Paperclip size={17} />
            </button>
            <input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask a career question..."
              className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-800 outline-none"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending || !inputMessage.trim()}
              className="bg-[#1e3a5f] hover:bg-[#274b76]"
              aria-label="Send message"
            >
              <Send size={15} data-icon="inline-start" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Assistant responses are educational guidance, not guaranteed hiring advice.
          </p>
        </div>
      </section>
    </div>
  )
}

/* =========================================================================
   PRACTICE VIEW (Sandboxed Code Execution with Backend Validation)
   ========================================================================= */
const STARTER_CODES = {
  PYTHON: `def two_sum(nums, target):
    # Return indices [i, j] such that nums[i] + nums[j] == target
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i
    return []

# Test execution
print(two_sum([2, 7, 11, 15], 9))
`,
  CPP: `#include <iostream>
#include <vector>
#include <unordered_map>

std::vector<int> twoSum(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int diff = target - nums[i];
        if (seen.count(diff)) {
            return {seen[diff], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    std::cout << "[0, 1]" << std::endl;
    return 0;
}
`,
  JAVA: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        System.out.println("[0, 1]");
    }
}
`,
}

function PracticeView() {
  const [language, setLanguage] = useState<'PYTHON' | 'CPP' | 'JAVA'>('PYTHON')
  const [code, setCode] = useState(STARTER_CODES.PYTHON)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submission, setSubmission] = useState<CodeSubmission | null>(null)
  const [questionId, setQuestionId] = useState<string>('')
  const [questionTitle, setQuestionTitle] = useState('Two Sum')
  const [questionDesc, setQuestionDesc] = useState(
    'Given an array of integers and an integer target, return indices of the two numbers such that they add up to target.'
  )

  useEffect(() => {
    // Initialize or retrieve practice question from backend
    if (apiClient.isAuthenticated()) {
      apiClient
        .startInterviewSession('TECHNICAL')
        .then((session) => {
          return apiClient.nextInterviewQuestion(session.id, 'Algorithms', 'CODING')
        })
        .then((q) => {
          setQuestionId(q.id)
          setQuestionTitle(q.topic || 'Two Sum')
          setQuestionDesc(q.promptText || questionDesc)
        })
        .catch(() => {
          // Keep default Two Sum demo
        })
    }
  }, [])

  const handleLanguageChange = (lang: 'PYTHON' | 'CPP' | 'JAVA') => {
    setLanguage(lang)
    setCode(STARTER_CODES[lang])
  }

  const handleSubmit = async () => {
    if (!apiClient.isAuthenticated()) {
      // Simulate sandbox execution for unauthenticated demo
      setIsSubmitting(true)
      setTimeout(() => {
        setSubmission({
          id: 'mock-sub-' + Date.now(),
          interviewQuestionId: questionId || 'mock-q-1',
          userId: 'guest',
          language,
          sourceCode: code,
          status: 'COMPLETED',
          testResults: {
            passedCount: 3,
            totalCount: 3,
            cases: [
              {
                input: 'nums=[2,7,11,15], target=9',
                expectedOutput: '[0, 1]',
                actualOutput: '[0, 1]',
                passed: true,
                durationMs: 42,
              },
              {
                input: 'nums=[3,2,4], target=6',
                expectedOutput: '[1, 2]',
                actualOutput: '[1, 2]',
                passed: true,
                durationMs: 38,
              },
              {
                input: 'nums=[3,3], target=6',
                expectedOutput: '[0, 1]',
                actualOutput: '[0, 1]',
                passed: true,
                durationMs: 35,
              },
            ],
          },
          submittedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        })
        setIsSubmitting(false)
      }, 1000)
      return
    }

    setIsSubmitting(true)
    try {
      let activeQuestionId = questionId
      if (!activeQuestionId) {
        try {
          const session = await apiClient.startInterviewSession('TECHNICAL')
          const q = await apiClient.nextInterviewQuestion(session.id, 'Two Sum', 'CODING')
          activeQuestionId = q.id
          setQuestionId(q.id)
        } catch {
          // fallback
        }
      }

      if (!activeQuestionId) {
        throw new Error('Please wait a moment for the practice question to load or restart the session.')
      }

      const sub = await apiClient.submitCode(activeQuestionId, language, code)
      const result = await apiClient.pollSubmissionResult(sub.id)
      setSubmission(result)
    } catch (err) {
      console.error('Code submission failed', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="mb-2 text-sm font-medium text-[#4f8cff]">Deterministic Code Sandbox</p>
        <h2 className="text-3xl font-semibold tracking-tight text-[#172033]">Coding Practice</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Build technical interview confidence. Code is evaluated inside an isolated backend Docker
          sandbox with strict memory, CPU, and pids limits.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Question Panel */}
        <section className="flex flex-col justify-between rounded-2xl border border-[#e5e9f0] bg-white p-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2866c7]">
                Easy • Arrays & Hash Tables
              </span>
              <span className="text-xs text-slate-400">15 min recommended</span>
            </div>

            <h3 className="mt-4 text-xl font-bold text-slate-900">{questionTitle}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{questionDesc}</p>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-700 border border-slate-200">
              <p className="font-semibold text-slate-900">Example 1:</p>
              Input: nums = [2, 7, 11, 15], target = 9<br />
              Output: [0, 1] (nums[0] + nums[1] == 9)
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-700 border border-slate-200">
              <p className="font-semibold text-slate-900">Constraints:</p>
              • 2 &le; nums.length &le; 10<sup>4</sup>
              <br />• Only one valid answer exists.
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 pt-4">
            <ShieldCheck size={14} className="text-emerald-600" />
            Backend sandbox security: seccomp enabled, unprivileged runner user.
          </div>
        </section>

        {/* Code Editor & Execution Results */}
        <section className="overflow-hidden rounded-2xl border border-[#e5e9f0] bg-[#111827] text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Code2 size={16} className="text-[#4f8cff]" />
                solution.{language === 'PYTHON' ? 'py' : language === 'CPP' ? 'cpp' : 'java'}
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
                {(['PYTHON', 'CPP', 'JAVA'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-semibold transition-colors',
                      language === lang
                        ? 'bg-[#4f8cff] text-white'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {lang === 'PYTHON' ? 'Python' : lang === 'CPP' ? 'C++' : 'Java'}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              aria-label="Code editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-[300px] w-full resize-none bg-transparent p-5 font-mono text-xs leading-6 text-slate-200 outline-none"
              spellCheck={false}
            />
          </div>

          <div>
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 bg-slate-900/50">
              <p className="text-xs text-slate-400">Safe sandbox execution</p>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#4f8cff] hover:bg-[#3d78df] text-xs font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles size={14} className="animate-spin" data-icon="inline-start" />
                    Running in sandbox...
                  </>
                ) : (
                  <>
                    <Play size={14} data-icon="inline-start" />
                    Run & Submit
                  </>
                )}
              </Button>
            </div>

            {/* Test Results Banner */}
            {submission && (
              <div
                className={cn(
                  'border-t p-5',
                  submission.testResults?.passedCount === submission.testResults?.totalCount
                    ? 'border-emerald-400/20 bg-emerald-400/10'
                    : 'border-rose-400/20 bg-rose-400/10'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {submission.testResults?.passedCount === submission.testResults?.totalCount ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-emerald-300">All Sandbox Tests Passed!</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="text-rose-400" />
                        <span className="text-rose-300">Some Tests Failed</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {submission.testResults?.passedCount} / {submission.testResults?.totalCount} test
                    cases
                  </span>
                </div>

                {submission.testResults?.compileError && (
                  <pre className="mt-3 rounded bg-black/40 p-3 font-mono text-xs text-rose-300 whitespace-pre-wrap">
                    {submission.testResults.compileError}
                  </pre>
                )}

                {submission.testResults?.cases && (
                  <div className="mt-3 flex flex-col gap-2">
                    {submission.testResults.cases.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded bg-black/30 px-3 py-1.5 font-mono text-[11px]"
                      >
                        <span className="text-slate-300">{c.input}</span>
                        <span
                          className={cn(
                            'font-semibold',
                            c.passed ? 'text-emerald-400' : 'text-rose-400'
                          )}
                        >
                          {c.passed ? `Passed (${c.durationMs}ms)` : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
