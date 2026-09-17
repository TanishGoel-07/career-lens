'use client'

import { useState, useEffect } from 'react'
import {
  Briefcase,
  Building2,
  MapPin,
  Search,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  apiClient,
  type Job,
  type SavedJob,
  type MatchResult,
  type Resume,
} from '@/lib/api-client'

interface JobsViewProps {
  onNavigateToResume?: () => void
}

export function JobsView({ onNavigateToResume }: JobsViewProps) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all')
  const [savedActionLoading, setSavedActionLoading] = useState(false)

  // Load initial jobs, saved jobs, and resumes
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [jobsRes, savedRes, resumesRes] = await Promise.allSettled([
        apiClient.searchJobs(),
        apiClient.isAuthenticated() ? apiClient.listSavedJobs() : Promise.resolve([]),
        apiClient.isAuthenticated() ? apiClient.listResumes() : Promise.resolve([]),
      ])

      if (jobsRes.status === 'fulfilled') {
        setJobs(jobsRes.value.data)
        if (jobsRes.value.data.length > 0) {
          setSelectedJob(jobsRes.value.data[0])
        }
      }

      if (savedRes.status === 'fulfilled') {
        setSavedJobs(savedRes.value)
      }

      if (resumesRes.status === 'fulfilled') {
        setResumes(resumesRes.value)
        if (resumesRes.value.length > 0) {
          setSelectedResumeId(resumesRes.value[0].id)
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsLoading(true)
    try {
      const res = await apiClient.searchJobs(query.trim() || undefined, location.trim() || undefined)
      setJobs(res.data)
      if (res.data.length > 0) {
        setSelectedJob(res.data[0])
        setMatchResult(null)
      } else {
        setSelectedJob(null)
        setMatchResult(null)
      }
    } catch (err) {
      console.error('Failed to search jobs', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch match score when selectedJob or selectedResume changes
  useEffect(() => {
    if (!selectedJob || !selectedResumeId || !apiClient.isAuthenticated()) {
      setMatchResult(null)
      return
    }

    let isMounted = true
    setIsMatching(true)
    apiClient
      .getMatch(selectedResumeId, selectedJob.id)
      .then((match) => {
        if (isMounted) setMatchResult(match)
      })
      .catch(() => {
        if (isMounted) setMatchResult(null)
      })
      .finally(() => {
        if (isMounted) setIsMatching(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedJob?.id, selectedResumeId])

  const handleSaveJob = async (jobId: string, status: 'SAVED' | 'APPLIED' = 'SAVED') => {
    if (!apiClient.isAuthenticated()) return
    setSavedActionLoading(true)
    try {
      const saved = await apiClient.saveJob(jobId, status)
      setSavedJobs((prev) => {
        const exists = prev.some((s) => s.jobId === jobId)
        if (exists) {
          return prev.map((s) => (s.jobId === jobId ? saved : s))
        }
        return [saved, ...prev]
      })
    } catch (err) {
      console.error('Failed to save job', err)
    } finally {
      setSavedActionLoading(false)
    }
  }

  const isJobSaved = (jobId: string) => savedJobs.some((s) => s.jobId === jobId)

  const displayedJobs = activeTab === 'all' ? jobs : savedJobs.map((s) => s.job)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-[#4f8cff]">Targeted Opportunities</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[#172033]">
            Job Matches & Skills Fit
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Compare your resume directly against real roles to discover matching skills and skill gaps.
          </p>
        </div>

        {/* Resume Selector */}
        {resumes.length > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e9f0] bg-white p-2">
            <FileText size={16} className="text-[#4f8cff] ml-1" />
            <select
              aria-label="Select resume for matching"
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none pr-2"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.originalFilename}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToResume}
            className="text-xs text-[#2866c7] border-[#cfe0ff] bg-[#eef4ff] hover:bg-[#dfeaff]"
          >
            <Sparkles size={14} data-icon="inline-start" />
            Upload resume to calculate match scores
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-2xl border border-[#e5e9f0] bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Role title or keyword (e.g. Frontend, NestJS)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#4f8cff] focus:ring-1 focus:ring-[#4f8cff]"
          />
        </div>
        <div className="relative w-full sm:w-56">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Location (e.g. Remote, San Francisco)..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#4f8cff] focus:ring-1 focus:ring-[#4f8cff]"
          />
        </div>
        <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs h-9 px-4">
          Search
        </Button>
      </form>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5e9f0] pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            activeTab === 'all'
              ? 'bg-[#eef4ff] text-[#2866c7]'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          All Roles ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            activeTab === 'saved'
              ? 'bg-[#eef4ff] text-[#2866c7]'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Saved Roles ({savedJobs.length})
        </button>
      </div>

      {/* Main Grid: Job Listings + Selected Job Details & Match Analysis */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        {/* Left Column: Job Cards */}
        <div className="flex flex-col gap-3 max-h-[750px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Sparkles className="animate-spin text-[#4f8cff] mb-2" size={24} />
              <p className="text-xs">Finding relevant positions...</p>
            </div>
          ) : displayedJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfe0ff] bg-white p-8 text-center text-slate-500">
              <Briefcase size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No roles found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search keywords or location filter.</p>
            </div>
          ) : (
            displayedJobs.map((job) => {
              const isSelected = selectedJob?.id === job.id
              const saved = isJobSaved(job.id)
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={cn(
                    'cursor-pointer rounded-2xl border p-5 transition-all text-left',
                    isSelected
                      ? 'border-[#4f8cff] bg-white shadow-sm ring-1 ring-[#4f8cff]'
                      : 'border-[#e5e9f0] bg-white hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{job.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building2 size={13} /> {job.company}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={13} /> {job.location}
                          </span>
                        )}
                        {job.seniority && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {job.seniority}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveJob(job.id)
                      }}
                      className={cn(
                        'rounded-lg p-1.5 text-slate-400 hover:text-[#2866c7]',
                        saved && 'text-[#2866c7]'
                      )}
                      title={saved ? 'Saved' : 'Save job'}
                    >
                      {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                    </button>
                  </div>

                  {/* Skills tags preview */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.requiredSkills.slice(0, 4).map((sk) => (
                      <span
                        key={sk}
                        className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200"
                      >
                        {sk}
                      </span>
                    ))}
                    {job.requiredSkills.length > 4 && (
                      <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                        +{job.requiredSkills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Selected Job Details & Match Breakdown */}
        {selectedJob ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-[#e5e9f0] bg-white p-6">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-[#eef0f4] pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedJob.title}</h3>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {selectedJob.company} • {selectedJob.location || 'Remote'} • {selectedJob.seniority || 'Mid/Senior'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveJob(selectedJob.id, 'APPLIED')}
                  disabled={savedActionLoading}
                  className="text-xs"
                >
                  Mark Applied
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveJob(selectedJob.id, 'SAVED')}
                  disabled={savedActionLoading}
                  className={cn(
                    'text-xs',
                    isJobSaved(selectedJob.id)
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-[#1e3a5f] hover:bg-[#274b76]'
                  )}
                >
                  {isJobSaved(selectedJob.id) ? (
                    <>
                      <BookmarkCheck size={14} data-icon="inline-start" /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} data-icon="inline-start" /> Save Role
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Match Evaluation Section */}
            {isMatching ? (
              <div className="flex items-center gap-3 rounded-xl bg-[#f5f8fc] p-4 text-xs text-slate-500">
                <Sparkles className="animate-spin text-[#4f8cff]" size={16} />
                Calculating matching score against your selected resume...
              </div>
            ) : matchResult ? (
              <div className="rounded-xl border border-[#cfe0ff] bg-[#f8faff] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-[#2866c7]" size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2866c7]">
                      Match Analysis
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#2866c7]">
                      {matchResult.overallScore}%
                    </span>
                    <span className="text-xs text-slate-400">match</span>
                  </div>
                </div>

                {/* Score Progress Bar */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      matchResult.overallScore >= 75
                        ? 'bg-emerald-500'
                        : matchResult.overallScore >= 50
                        ? 'bg-[#4f8cff]'
                        : 'bg-amber-500'
                    )}
                    style={{ width: `${matchResult.overallScore}%` }}
                  />
                </div>

                {/* AI Explanation */}
                {matchResult.explanation && (
                  <p className="mt-3 text-xs leading-5 text-slate-600 bg-white/70 rounded-lg p-2.5 border border-slate-100">
                    {matchResult.explanation}
                  </p>
                )}

                {/* Skills breakdown */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={13} /> Matching Skills ({matchResult.matchingSkills.length})
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {matchResult.matchingSkills.length > 0 ? (
                        matchResult.matchingSkills.map((sk) => (
                          <span
                            key={sk}
                            className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200"
                          >
                            {sk}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">None detected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                      <XCircle size={13} /> Missing Required ({matchResult.missingRequired.length})
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {matchResult.missingRequired.length > 0 ? (
                        matchResult.missingRequired.map((sk) => (
                          <span
                            key={sk}
                            className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-200"
                          >
                            {sk}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-emerald-600">All required skills met!</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Missing optional / nice to have */}
                {matchResult.missingOptional && matchResult.missingOptional.length > 0 && (
                  <div className="mt-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <AlertCircle size={13} /> Nice-to-have Skills to Learn
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {matchResult.missingOptional.map((sk) => (
                        <span
                          key={sk}
                          className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 flex items-center justify-between">
                <span>Select a resume above to evaluate how well your profile matches this role.</span>
                {resumes.length === 0 && (
                  <button
                    onClick={onNavigateToResume}
                    className="font-semibold text-[#2866c7] hover:underline shrink-0 ml-2"
                  >
                    Upload Resume &rarr;
                  </button>
                )}
              </div>
            )}

            {/* Description & Requirements */}
            <div className="mt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Role Description</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-line">
                {selectedJob.description}
              </p>
            </div>

            {/* Required Skills Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Required Skills</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedJob.requiredSkills.map((sk) => (
                  <span
                    key={sk}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Optional Skills */}
            {selectedJob.optionalSkills && selectedJob.optionalSkills.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Bonus / Optional Skills</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedJob.optionalSkills.map((sk) => (
                    <span
                      key={sk}
                      className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 border border-dashed border-slate-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-[#e5e9f0] bg-white p-12 text-slate-400">
            Select a role on the left to view details and calculate skills fit.
          </div>
        )}
      </div>
    </div>
  )
}
