'use client'

import { useState, useEffect } from 'react'
import {
  Target,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  BookOpen,
  Calendar,
  Compass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  apiClient,
  type TargetRole,
  type UserSkill,
  type SkillGap,
  type Roadmap,
} from '@/lib/api-client'

interface SkillsViewProps {
  onNavigateToRoadmap?: () => void
}

export function SkillsView({ onNavigateToRoadmap }: SkillsViewProps) {
  const [targetRoles, setTargetRoles] = useState<TargetRole[]>([])
  const [selectedRole, setSelectedRole] = useState<TargetRole | null>(null)
  const [userSkills, setUserSkills] = useState<UserSkill[]>([])
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([])
  const [newSkillInput, setNewSkillInput] = useState('')
  const [isAddingSkill, setIsAddingSkill] = useState(false)
  const [isLoadingGaps, setIsLoadingGaps] = useState(false)
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false)
  const [hoursPerWeek, setHoursPerWeek] = useState(10)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [newRoleTitle, setNewRoleTitle] = useState('')
  const [newRoleSkillsInput, setNewRoleSkillsInput] = useState('')
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [roadmapSuccess, setRoadmapSuccess] = useState<Roadmap | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    if (!apiClient.isAuthenticated()) return
    try {
      const [roles, skills] = await Promise.all([
        apiClient.listTargetRoles(),
        apiClient.listUserSkills(),
      ])
      setTargetRoles(roles)
      setUserSkills(skills)
      if (roles.length > 0) {
        setSelectedRole(roles[0])
      }
    } catch (err) {
      console.error('Failed to load target roles / skills', err)
    }
  }

  // When selectedRole changes, load skill gaps
  useEffect(() => {
    if (!selectedRole || !apiClient.isAuthenticated()) {
      setSkillGaps([])
      return
    }

    let isMounted = true
    setIsLoadingGaps(true)
    apiClient
      .getSkillGaps(selectedRole.id)
      .then((gaps) => {
        if (isMounted) setSkillGaps(gaps)
      })
      .catch(() => {
        if (isMounted) setSkillGaps([])
      })
      .finally(() => {
        if (isMounted) setIsLoadingGaps(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedRole?.id])

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSkillInput.trim() || !apiClient.isAuthenticated()) return
    setIsAddingSkill(true)
    try {
      const added = await apiClient.addUserSkill(newSkillInput.trim())
      setUserSkills((prev) => [...prev, added])
      setNewSkillInput('')
      // Refresh skill gaps
      if (selectedRole) {
        const gaps = await apiClient.getSkillGaps(selectedRole.id)
        setSkillGaps(gaps)
      }
    } catch (err) {
      console.error('Failed to add skill', err)
    } finally {
      setIsAddingSkill(false)
    }
  }

  const handleCreateTargetRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleTitle.trim() || !apiClient.isAuthenticated()) return
    setIsCreatingRole(true)
    try {
      const skillsArray = newRoleSkillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, importance: 'REQUIRED' as const, minProficiency: 3 }))

      const created = await apiClient.createTargetRole(newRoleTitle.trim(), skillsArray)
      setTargetRoles((prev) => [...prev, created])
      setSelectedRole(created)
      setShowCreateRole(false)
      setNewRoleTitle('')
      setNewRoleSkillsInput('')
    } catch (err) {
      console.error('Failed to create target role', err)
    } finally {
      setIsCreatingRole(false)
    }
  }

  const handleGenerateRoadmap = async () => {
    if (!selectedRole || !apiClient.isAuthenticated()) return
    setIsGeneratingRoadmap(true)
    setRoadmapSuccess(null)
    try {
      const roadmap = await apiClient.generateRoadmap(selectedRole.id, hoursPerWeek)
      setRoadmapSuccess(roadmap)
    } catch (err) {
      console.error('Failed to generate roadmap', err)
    } finally {
      setIsGeneratingRoadmap(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-[#4f8cff]">Skill Graph & Readiness</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[#172033]">
            Target Roles & Skill Gap Analysis
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Map your verified profile skills against your target job title to identify and sequence your skill gaps.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateRole(!showCreateRole)}
          className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs"
        >
          <Plus size={15} data-icon="inline-start" />
          {showCreateRole ? 'Cancel' : 'New Target Role'}
        </Button>
      </div>

      {/* Target Role Creation Form (Collapsible) */}
      {showCreateRole && (
        <form
          onSubmit={handleCreateTargetRole}
          className="rounded-2xl border border-[#cfe0ff] bg-[#f8faff] p-5 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2">
            <Target size={18} className="text-[#2866c7]" />
            <h3 className="text-sm font-bold text-slate-800">Define a New Target Role</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Target Role Title</label>
              <input
                type="text"
                placeholder="e.g. Senior Backend Engineer"
                value={newRoleTitle}
                onChange={(e) => setNewRoleTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4f8cff]"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Key Required Skills (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Node.js, PostgreSQL, Docker, Redis"
                value={newRoleSkillsInput}
                onChange={(e) => setNewRoleSkillsInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4f8cff]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateRole(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCreatingRole}
              className="bg-[#1e3a5f] hover:bg-[#274b76]"
            >
              {isCreatingRole ? 'Saving Role...' : 'Create Target Role'}
            </Button>
          </div>
        </form>
      )}

      {/* Target Role Selector Tabs */}
      {targetRoles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#e5e9f0] pb-2">
          {targetRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={cn(
                'whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                selectedRole?.id === role.id
                  ? 'bg-[#1e3a5f] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              <span className="flex items-center gap-1.5">
                <Compass size={14} />
                {role.title}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        {/* Left Column: My Skills Inventory */}
        <div className="flex flex-col gap-5 rounded-2xl border border-[#e5e9f0] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Your Skills Inventory</h3>
              <p className="text-xs text-slate-500">Skills extracted from resume or self-reported.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2866c7]">
              {userSkills.length} Verified
            </span>
          </div>

          {/* Add Skill Input */}
          <form onSubmit={handleAddSkill} className="flex gap-2">
            <input
              type="text"
              placeholder="Add skill (e.g. GraphQL, Kubernetes)..."
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#4f8cff]"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isAddingSkill}
              className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs shrink-0"
            >
              <Plus size={13} data-icon="inline-start" /> Add
            </Button>
          </form>

          {/* Skills Badges */}
          <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
            {userSkills.length === 0 ? (
              <p className="text-xs text-slate-400">
                No skills added yet. Add skills above or upload your resume to extract them automatically.
              </p>
            ) : (
              userSkills.map((us) => (
                <span
                  key={us.id}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs"
                >
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  {us.skill.name}
                  <span className="ml-1 text-[10px] text-slate-400">
                    lvl {us.proficiency}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Skill Gaps & Roadmap Trigger */}
        <div className="flex flex-col gap-5 rounded-2xl border border-[#e5e9f0] bg-white p-6">
          <div className="flex items-center justify-between border-b border-[#eef0f4] pb-4">
            <div>
              <h3 className="font-bold text-slate-800">
                Skill Gaps for {selectedRole?.title || 'Selected Role'}
              </h3>
              <p className="text-xs text-slate-500">
                Prerequisites sorted in dependency-aware learning order.
              </p>
            </div>

            {selectedRole && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                {skillGaps.length} Gaps Found
              </span>
            )}
          </div>

          {/* Skill Gap Cards */}
          {isLoadingGaps ? (
            <div className="flex flex-col items-center justify-center p-10 text-slate-400">
              <Sparkles className="animate-spin text-[#4f8cff] mb-2" size={24} />
              <p className="text-xs">Computing topological skill gap graph...</p>
            </div>
          ) : !selectedRole ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Select or create a target role to view required competencies and gaps.
            </div>
          ) : skillGaps.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
              <h4 className="text-sm font-bold text-emerald-800">No Skill Gaps Detected!</h4>
              <p className="mt-1 text-xs text-emerald-700">
                You already meet all verified competencies for {selectedRole.title}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
              {skillGaps.map((gap, index) => (
                <div
                  key={gap.skillId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[#4f8cff]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#2866c7]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{gap.skillName}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Difficulty: {gap.difficulty} / 5</span>
                        <span>•</span>
                        <span
                          className={cn(
                            'font-medium',
                            gap.prerequisitesMet ? 'text-emerald-600' : 'text-amber-600'
                          )}
                        >
                          {gap.prerequisitesMet ? 'Prerequisites met' : 'Prerequisites required'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      gap.priority >= 3
                        ? 'bg-rose-50 text-rose-700'
                        : gap.priority === 2
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    Priority {gap.priority}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Generate Roadmap CTA */}
          {selectedRole && skillGaps.length > 0 && (
            <div className="rounded-xl border border-[#cfe0ff] bg-[#f8faff] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#2866c7]">
                    Generate Personalized Roadmap
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structure these gaps into chronological milestones and study modules.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <select
                    aria-label="Hours per week"
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value={5}>5 hrs/wk (Relaxed)</option>
                    <option value={10}>10 hrs/wk (Standard)</option>
                    <option value={20}>20 hrs/wk (Intensive)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {roadmapSuccess ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={16} /> Roadmap successfully generated!
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Calculated for {hoursPerWeek} hours/week pace
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {roadmapSuccess && onNavigateToRoadmap && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNavigateToRoadmap}
                      className="text-xs text-[#2866c7] border-[#cfe0ff]"
                    >
                      View Roadmap <ArrowRight size={13} data-icon="inline-end" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleGenerateRoadmap}
                    disabled={isGeneratingRoadmap}
                    className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs"
                  >
                    {isGeneratingRoadmap ? (
                      <>
                        <Sparkles size={14} className="animate-spin" data-icon="inline-start" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Layers size={14} data-icon="inline-start" />
                        {roadmapSuccess ? 'Regenerate Roadmap' : 'Generate Roadmap'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
