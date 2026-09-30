'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  ExternalLink,
  FileCheck2,
  Layers,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiClient, type Roadmap, type RoadmapModule } from '@/lib/api-client'

interface RoadmapViewProps {
  onNavigateToSkills: () => void
}

export function RoadmapView({ onNavigateToSkills }: RoadmapViewProps) {
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

  // Fallback demo milestones
  const defaultModules: RoadmapModule[] = [
    {
      id: 'demo-1',
      roadmapId: 'road-default',
      skillGapId: null,
      title: 'Week 1: Architecture & Theory — Docker & Container Isolation',
      type: 'MODULE',
      status: 'COMPLETED',
      orderIndex: 0,
      completedAt: new Date().toISOString(),
      resources: {
        week: 1,
        hoursEstimate: 4,
        keyObjectives: ['Multi-stage Docker builds', 'Seccomp & security profiles'],
        documentation: ['https://docs.docker.com/get-started/'],
      },
    },
    {
      id: 'demo-2',
      roadmapId: 'road-default',
      skillGapId: null,
      title: 'Week 1: Hands-on Lab — Containerize Multi-tier Services',
      type: 'PRACTICE',
      status: 'IN_PROGRESS',
      orderIndex: 1,
      completedAt: null,
      resources: {
        week: 1,
        hoursEstimate: 5,
        deliverable: 'Containerize multi-service application with Docker Compose and healthchecks',
        tasks: ['Optimize container image size < 90MB', 'Configure non-root user execution'],
      },
    },
    {
      id: 'demo-3',
      roadmapId: 'road-default',
      skillGapId: null,
      title: 'Week 2: Distributed Caching Architecture & Redis',
      type: 'MODULE',
      status: 'NOT_STARTED',
      orderIndex: 2,
      completedAt: null,
      resources: {
        week: 2,
        hoursEstimate: 6,
        documentation: ['https://redis.io/docs/latest/develop/data-types/'],
        tasks: ['Implement write-through cache', 'Benchmark latency spikes'],
      },
    },
    {
      id: 'demo-4',
      roadmapId: 'road-default',
      skillGapId: null,
      title: 'Final Capstone: Portfolio Architecture for Target Role',
      type: 'PROJECT',
      status: 'NOT_STARTED',
      orderIndex: 3,
      completedAt: null,
      resources: {
        week: 3,
        hoursEstimate: 20,
        deliverable: 'Deploy production-grade microservices system with CI/CD and metrics',
        tasks: ['Write architecture decision records (ADRs)', 'Deploy and test under load'],
      },
    },
  ]

  const modules = activeRoadmap?.modules?.length ? activeRoadmap.modules : defaultModules

  const completedCount = modules.filter((m) => m.status === 'COMPLETED').length
  const progressPct = Math.round((completedCount / Math.max(modules.length, 1)) * 100)

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#2866c7]">
              <Layers size={13} />
              Topologically Sequenced Roadmap
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#172033]">
            Curated Career Progression Curriculum
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            A dependency-aware visual plan sequenced by foundational prerequisites. Modules balance architectural theory, practical hands-on labs, and real capstone deliverables.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateToSkills}
          className="text-xs text-[#2866c7] border-[#cfe0ff] bg-[#eef4ff] hover:bg-[#dfeaff] font-semibold"
        >
          <Target size={14} data-icon="inline-start" />
          Target Roles & Skill Gaps
        </Button>
      </div>

      {/* Progress Banner */}
      <section className="rounded-2xl border border-[#e5e9f0] bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Role Velocity</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              {activeRoadmap ? 'Active Learning Pathway' : 'Senior Backend Systems Curriculum'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900">{progressPct}% Complete</span>
              <p className="text-[10px] text-slate-400">
                {completedCount} of {modules.length} milestones
              </p>
            </div>
            <div className="h-10 w-24 overflow-hidden rounded-full bg-slate-100 p-1">
              <div
                className="h-full rounded-full bg-[#4f8cff] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Milestone Steps */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {modules.map((mod, index) => {
            const isDone = mod.status === 'COMPLETED'
            const inProg = mod.status === 'IN_PROGRESS'
            return (
              <div key={mod.id} className="relative">
                <div
                  className={cn(
                    'mb-3 flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
                    isDone
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : inProg
                      ? 'border-[#4f8cff] bg-blue-50 text-[#2866c7]'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  )}
                >
                  {isDone ? <Check size={18} /> : index + 1}
                </div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-2">{mod.title}</h4>
                <p className="mt-1 text-[11px] text-slate-400 capitalize">
                  {mod.status.replace('_', ' ').toLowerCase()}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Modules Detailed Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((mod) => {
          const isDone = mod.status === 'COMPLETED'
          const res = (mod.resources as any) || {}
          return (
            <div
              key={mod.id}
              className={cn(
                'rounded-2xl border p-5 flex flex-col justify-between transition-all bg-white shadow-xs',
                isDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-[#e5e9f0] hover:border-[#4f8cff]'
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      mod.type === 'PROJECT'
                        ? 'bg-violet-100 text-violet-800'
                        : mod.type === 'PRACTICE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-[#2866c7]'
                    )}
                  >
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

                <h4 className="mt-3 text-sm font-bold text-slate-900">{mod.title}</h4>

                {/* Hours estimate & Deliverable */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {res.hoursEstimate && (
                    <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      <Timer size={12} /> ~{res.hoursEstimate} hours
                    </span>
                  )}
                  {res.week && (
                    <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      <Calendar size={12} /> Week {res.week}
                    </span>
                  )}
                </div>

                {res.deliverable && (
                  <p className="mt-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-5">
                    <span className="font-bold text-slate-900">Deliverable:</span> {res.deliverable}
                  </p>
                )}

                {/* Documentation Links */}
                {res.documentation && res.documentation.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Curated Documentation:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {res.documentation.map((doc: string, i: number) => (
                        <a
                          key={i}
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <BookOpen size={12} /> Official Docs <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">Step {mod.orderIndex + 1}</span>
                <Button
                  size="sm"
                  variant={isDone ? 'outline' : 'default'}
                  onClick={() => handleToggleModule(mod.id, mod.status)}
                  className={cn(
                    'text-xs font-semibold',
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
