'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  Award,
  CheckCircle2,
  Code2,
  ExternalLink,
  GitFork,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react'
import { GithubIcon } from '@/components/ui/github-icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiClient, type GitHubProfile } from '@/lib/api-client'

export function GitHubView() {
  const [username, setUsername] = useState('')
  const [profile, setProfile] = useState<GitHubProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      setIsLoading(true)
      apiClient
        .getGitHubProfile()
        .then((p) => {
          if (p) {
            setProfile(p)
            setUsername(p.username)
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    }
  }, [])

  const handleSync = async () => {
    if (!username.trim() || isSyncing) return
    setIsSyncing(true)
    setError(null)

    try {
      const updated = await apiClient.syncGitHub(username.trim())
      setProfile(updated)
    } catch (err: any) {
      setError(err?.message || 'Failed to sync GitHub profile.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
            <GithubIcon size={13} />
            GitHub Developer Intelligence
          </span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#172033]">
          GitHub Portfolio & Skill Verification
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Verify your engineering skills directly from code repositories. We analyze code quality, commit consistency, language distribution, and star impact to prove hands-on developer capability.
        </p>
      </div>

      {/* Sync Card */}
      <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Connect & Sync GitHub Profile
        </h3>
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <GithubIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. torvalds or your GitHub username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSync()}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing || !username.trim()}
            className="w-full sm:w-auto bg-[#1e3a5f] hover:bg-[#274b76] text-xs font-semibold"
          >
            {isSyncing ? (
              <>
                <RefreshCw size={14} className="animate-spin" data-icon="inline-start" />
                Analyzing Repositories...
              </>
            ) : (
              <>
                <RefreshCw size={14} data-icon="inline-start" />
                Sync GitHub Intelligence
              </>
            )}
          </Button>
        </div>

        {error && (
          <p className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-lg inline-block">
            {error}
          </p>
        )}
      </section>

      {/* Profile Overview */}
      {profile && (
        <div className="flex flex-col gap-6">
          {/* Top KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Developer Profile Score
              </span>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {profile.profileScore}
                <span className="text-sm font-normal text-slate-400"> / 100</span>
              </p>
              <p className="mt-2 text-xs text-emerald-600 font-medium">
                Evaluated from public repositories
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Portfolio Quality Score
              </span>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {profile.portfolioScore}
                <span className="text-sm font-normal text-slate-400"> / 100</span>
              </p>
              <p className="mt-2 text-xs text-blue-600 font-medium">README, tech stack & packaging</p>
            </div>

            <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Public Repositories
              </span>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {profile.totalRepos}
              </p>
              <p className="mt-2 text-xs text-slate-500">Active open-source footprint</p>
            </div>

            <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Stars Received
              </span>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {profile.totalStars}
              </p>
              <p className="mt-2 text-xs text-amber-600 font-medium">Community peer recognition</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            {/* Language Breakdown & Verified Skills */}
            <div className="flex flex-col gap-5">
              {/* Language Distribution */}
              <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Language Distribution
                </h3>
                <div className="flex flex-col gap-3">
                  {profile.topLanguages && profile.topLanguages.length > 0 ? (
                    profile.topLanguages.map((l, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>{l.language}</span>
                          <span>{l.percentage}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              i === 0
                                ? 'bg-blue-600'
                                : i === 1
                                ? 'bg-emerald-500'
                                : i === 2
                                ? 'bg-amber-500'
                                : 'bg-violet-500'
                            )}
                            style={{ width: `${l.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No language data found.</p>
                  )}
                </div>
              </div>

              {/* Verified Skills Badge */}
              <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    GitHub-Verified Engineering Skills
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Skills identified in production projects automatically update your verified skill profile with 95% confidence.
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.topLanguages.map((l, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200"
                    >
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      {l.language} • Verified
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Repositories Showcase */}
            <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Top Public Repositories Analyzed
              </h3>
              <div className="flex flex-col gap-3">
                {profile.repos && profile.repos.length > 0 ? (
                  profile.repos.map((repo) => (
                    <div
                      key={repo.id}
                      className="rounded-xl border border-slate-100 p-4 hover:border-slate-300 transition-colors bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-slate-900 hover:text-blue-600 text-sm inline-flex items-center gap-1.5"
                          >
                            {repo.name}
                            <ExternalLink size={13} className="text-slate-400" />
                          </a>
                          <p className="mt-1 text-xs text-slate-500 leading-5">
                            {repo.description || 'No description provided.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-[#2866c7]">
                          Quality: {repo.qualityScore}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {repo.language && (
                            <span className="font-semibold text-slate-700">{repo.language}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star size={12} className="text-amber-500" /> {repo.stars}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork size={12} className="text-slate-400" /> {repo.forks}
                          </span>
                        </div>

                        {repo.techStack && repo.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {repo.techStack.slice(0, 3).map((t, i) => (
                              <span
                                key={i}
                                className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-medium text-slate-700"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No repositories synced yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <LockKeyhole size={14} />
        CareerLens reads only public GitHub repositories and metadata. Private repositories are never accessed without authorization.
      </div>
    </div>
  )
}
