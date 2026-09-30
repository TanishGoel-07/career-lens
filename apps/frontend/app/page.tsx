'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CircleHelp,
  Code2,
  FileText,
  LayoutDashboard,
  Layers,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react'
import { GithubIcon } from '@/components/ui/github-icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiClient, type User } from '@/lib/api-client'
import { OverviewView } from '@/components/overview/overview-view'
import { ResumeView } from '@/components/resume/resume-view'
import { JobsView } from '@/components/jobs/jobs-view'
import { SkillsView } from '@/components/skills/skills-view'
import { RoadmapView } from '@/components/roadmap/roadmap-view'
import { CoachView } from '@/components/coach/coach-view'
import { PracticeView } from '@/components/practice/practice-view'
import { GitHubView } from '@/components/github/github-view'
import { InterviewView } from '@/components/interview/interview-view'
import { AuthModal } from '@/components/auth/auth-modal'
import { ProfileDialog } from '@/components/profile/profile-dialog'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export type View =
  | 'overview'
  | 'resume'
  | 'practice'
  | 'interview'
  | 'github'
  | 'jobs'
  | 'skills'
  | 'roadmap'
  | 'assistant'

const navItems: { id: View; label: string; icon: any; badge?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'resume', label: 'Resume Intelligence', icon: FileText, badge: 'ATS v2' },
  { id: 'practice', label: 'Coding Practice', icon: Code2, badge: 'Docker' },
  { id: 'interview', label: 'Mock Interview Studio', icon: Zap },
  { id: 'github', label: 'GitHub Verification', icon: GithubIcon },
  { id: 'jobs', label: 'Semantic Job Matches', icon: BriefcaseBusiness },
  { id: 'skills', label: 'Skills & Role Graph', icon: Target },
  { id: 'roadmap', label: 'Curated Roadmap', icon: Layers },
  { id: 'assistant', label: 'Career Copilot & RAG', icon: Bot },
]

export default function Page() {
  const [view, setView] = useState<View>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // Load authenticated user on mount
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
            <span className="text-lg font-bold tracking-tight">
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

        <div className="flex flex-1 flex-col gap-1 px-3 py-5 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Intelligence Modules
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id)
                  setMobileNav(false)
                }}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all',
                  active
                    ? 'bg-[#eef4ff] text-[#2866c7] font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} className={active ? 'text-[#2866c7]' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase',
                      active ? 'bg-blue-200/60 text-blue-900' : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}

          <div className="mt-6 border-t border-[#eef0f4] pt-4">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Account & Profile
            </p>
            {user ? (
              <>
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Settings2 size={16} />
                  Settings & Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#2866c7] hover:bg-blue-50"
              >
                <LogIn size={16} />
                Sign In / Register
              </button>
            )}
            <button
              onClick={() => alert('CareerLens AI Platform — Documentation and API contracts available at /api/docs')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <CircleHelp size={16} />
              Help & Documentation
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#e6e9ef] bg-white/95 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              className="text-slate-600 lg:hidden"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <h1 className="text-base font-bold tracking-tight text-slate-900">
                {view === 'overview'
                  ? `Welcome back, ${user?.profile?.fullName || user?.email?.split('@')[0] || 'Candidate'}`
                  : navItems.find((item) => item.id === view)?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#e5e9f0] px-3 py-1.5 text-xs text-slate-500 sm:flex">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Private & Encrypted</span>
            </div>

            <ThemeToggle />

            {!user ? (
              <Button
                size="sm"
                onClick={() => setAuthModalOpen(true)}
                className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs font-semibold"
              >
                <LogIn size={13} data-icon="inline-start" />
                Sign In
              </Button>
            ) : (
              <button
                onClick={() => setProfileModalOpen(true)}
                className="flex size-9 items-center justify-center rounded-full border border-[#e5e9f0] bg-white text-slate-600 hover:bg-slate-50 font-bold text-xs"
                aria-label="Profile"
                title={user.email}
              >
                {getInitials(user.profile?.fullName, user.email)}
              </button>
            )}
          </div>
        </header>

        {/* View Switcher Container */}
        <main className="mx-auto max-w-[1440px] w-full p-5 lg:p-10">
          {view === 'overview' && (
            <OverviewView
              go={setView}
              onAuth={() => setAuthModalOpen(true)}
              isAuth={Boolean(user)}
            />
          )}
          {view === 'resume' && <ResumeView onAuth={() => setAuthModalOpen(true)} />}
          {view === 'practice' && <PracticeView />}
          {view === 'interview' && <InterviewView />}
          {view === 'github' && <GitHubView />}
          {view === 'jobs' && <JobsView onNavigateToResume={() => setView('resume')} />}
          {view === 'skills' && <SkillsView onNavigateToRoadmap={() => setView('roadmap')} />}
          {view === 'roadmap' && <RoadmapView onNavigateToSkills={() => setView('skills')} />}
          {view === 'assistant' && <CoachView />}
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
