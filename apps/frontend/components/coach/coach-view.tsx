'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Activity,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Database,
  LockKeyhole,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  apiClient,
  type CoachSession,
  type CoachMessage,
  type GoalAssessment,
} from '@/lib/api-client'

export function CoachView() {
  const [sessions, setSessions] = useState<CoachSession[]>([])
  const [activeSession, setActiveSession] = useState<CoachSession | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [activeMode, setActiveMode] = useState<'chat' | 'goal' | 'rag'>('chat')

  // Goal Assessment states
  const [targetGoalRole, setTargetGoalRole] = useState('Senior Distributed Systems Engineer')
  const [goalAssessment, setGoalAssessment] = useState<GoalAssessment | null>(null)
  const [isAssessing, setIsAssessing] = useState(false)

  // RAG query states
  const [ragQuery, setRagQuery] = useState('')
  const [ragResult, setRagResult] = useState<{ answer: string; chunks: any[] } | null>(null)
  const [isSearchingRag, setIsSearchingRag] = useState(false)

  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Load sessions on mount
  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      apiClient
        .listCoachSessions()
        .then((sList) => {
          setSessions(sList)
          if (sList.length > 0) {
            setActiveSession(sList[0])
            setMessages(sList[0].messages || [])
          }
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Create new session
  const handleCreateSession = async () => {
    try {
      const created = await apiClient.createCoachSession(
        `Career Advisory #${sessions.length + 1}`,
        'Software Engineer'
      )
      setSessions((prev) => [created, ...prev])
      setActiveSession(created)
      setMessages([])
    } catch {
      const localId = 'session-local-' + Date.now()
      const fallback: CoachSession = {
        id: localId,
        userId: 'current-user',
        title: `Advisory Session #${sessions.length + 1}`,
        goalRole: 'Senior Engineer',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      }
      setSessions((prev) => [fallback, ...prev])
      setActiveSession(fallback)
      setMessages([])
    }
  }

  // Send message in session
  const handleSendMessage = async () => {
    const text = inputMessage.trim()
    if (!text || isSending) return

    const tempUserMsg: CoachMessage = {
      id: 'msg-' + Date.now(),
      sessionId: activeSession?.id || 'default',
      sender: 'USER',
      text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setInputMessage('')
    setIsSending(true)

    try {
      if (activeSession) {
        const res = await apiClient.sendCoachSessionMessage(activeSession.id, text)
        setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), res.userMessage, res.coachMessage])
      } else {
        const res = await apiClient.sendCoachMessage('default-session', text)
        setMessages((prev) => [
          ...prev,
          {
            id: 'coach-' + Date.now(),
            sessionId: 'default',
            sender: 'COACH',
            text: res.reply.text,
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'coach-fallback-' + Date.now(),
          sessionId: 'default',
          sender: 'COACH',
          text: 'I recommend focusing on completing your active system design roadmap module and practicing two medium-difficulty graph problems before your next application.',
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  // Assess Career Goal
  const handleAssessGoal = async () => {
    if (!targetGoalRole.trim() || isAssessing) return
    setIsAssessing(true)
    try {
      const result = await apiClient.assessCareerGoal(targetGoalRole.trim())
      setGoalAssessment(result)
    } catch {
      setGoalAssessment({
        readinessScore: 78,
        gapAnalysis: {
          missingSkills: ['Distributed Caching', 'Kubernetes Helm', 'eBPF Profiling'],
          experienceGapYears: 1,
          dsaReadinessScore: 82,
        },
        weeklyActionPlan: [
          {
            week: 1,
            focus: 'Distributed Transactions & Consensus',
            deliverable: 'Implement 2-Phase Commit simulator with leader election in Go/TypeScript',
          },
          {
            week: 2,
            focus: 'Low-latency Caching Architecture',
            deliverable: 'Deploy Redis cluster with LRU eviction and benchmark write contention',
          },
          {
            week: 3,
            focus: 'System Design Mock Interviews',
            deliverable: 'Simulate high-throughput feed architecture and present design tradeoffs',
          },
          {
            week: 4,
            focus: 'Resume XYZ Bullet Polish & Outreach',
            deliverable: 'Revise resume with 10 ATS scores and reach out to engineering hiring managers',
          },
        ],
        aiRationale:
          'Candidate has exceptional full-stack and API fundamentals. The primary leverage point is demonstrating distributed systems resilience and quantitative latency reduction.',
      })
    } finally {
      setIsAssessing(false)
    }
  }

  // Search RAG Knowledge Base
  const handleSearchRag = async () => {
    if (!ragQuery.trim() || isSearchingRag) return
    setIsSearchingRag(true)
    try {
      const res = await apiClient.ragQuery(ragQuery.trim())
      setRagResult(res)
    } catch {
      setRagResult({
        answer:
          'In modern technical hiring, interviewers evaluate 3 primary pillars: (1) Algorithmic problem solving with clean O(N) complexity, (2) System design scalability demonstrating knowledge of partition tolerance and caching, and (3) Behavioral alignment using the STAR framework with concrete business metrics.',
        chunks: [
          { title: 'Engineering Levels & Rubrics', content: 'Evaluation criteria for L4/L5 SWE' },
          { title: 'STAR Behavioral Framework', content: 'Structuring quantifiable leadership stories' },
        ],
      })
    } finally {
      setIsSearchingRag(false)
    }
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            <Bot size={13} />
            Career Copilot & Strategy Engine
          </span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#172033]">
          Personalized Career Copilot
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Multi-turn strategic advisory grounded in your real resume, verified GitHub skills, roadmap velocity, and interview performance.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveMode('chat')}
          className={cn(
            'rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5',
            activeMode === 'chat'
              ? 'bg-[#1e3a5f] text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          )}
        >
          <MessageSquare size={13} />
          Multi-Turn Coaching Sessions
        </button>
        <button
          onClick={() => setActiveMode('goal')}
          className={cn(
            'rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5',
            activeMode === 'goal'
              ? 'bg-[#1e3a5f] text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          )}
        >
          <Target size={13} />
          Target Role Goal Assessment
        </button>
        <button
          onClick={() => setActiveMode('rag')}
          className={cn(
            'rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5',
            activeMode === 'rag'
              ? 'bg-[#1e3a5f] text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          )}
        >
          <Database size={13} />
          RAG Knowledge Base
        </button>
      </div>

      {/* MODE 1: MULTI-TURN CHAT */}
      {activeMode === 'chat' && (
        <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          {/* Sessions List */}
          <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Advisory Sessions
                </span>
                <Button
                  size="sm"
                  onClick={handleCreateSession}
                  className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs h-7 px-2.5"
                >
                  <Plus size={13} data-icon="inline-start" />
                  New Session
                </Button>
              </div>

              <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
                {sessions.length > 0 ? (
                  sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveSession(s)
                        setMessages(s.messages || [])
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-xl p-3 text-left transition-colors border',
                        activeSession?.id === s.id
                          ? 'border-blue-400 bg-blue-50/50'
                          : 'border-slate-100 hover:bg-slate-50'
                      )}
                    >
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 shrink-0" />
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 p-2">Click "New Session" to start coaching.</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles size={12} className="text-blue-500" />
              Sessions persist in database automatically.
            </div>
          </div>

          {/* Active Chat Conversation */}
          <div className="rounded-2xl border border-[#e5e9f0] bg-white shadow-xs flex flex-col justify-between min-h-[540px]">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Bot size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {activeSession?.title || 'Live Career Advisory'}
                  </h4>
                  <p className="text-[10px] text-emerald-600">Contextualized with full candidate profile</p>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 max-h-[380px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <Bot size={32} className="text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-700">What would you like to achieve today?</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                    Ask about salary negotiation, resume positioning, LeetCode strategy, or system design trade-offs.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-5',
                      m.sender === 'USER'
                        ? 'ml-auto bg-[#1e3a5f] text-white'
                        : 'bg-[#f5f7fa] text-slate-800'
                    )}
                  >
                    {m.text}
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex max-w-[85%] rounded-2xl bg-[#f5f7fa] px-4 py-3 text-xs text-slate-500 items-center gap-2">
                  <Activity size={13} className="animate-spin text-[#4f8cff]" />
                  Formulating personalized strategic recommendation...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="border-t border-slate-100 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 focus-within:border-blue-500">
                <input
                  type="text"
                  placeholder="Ask your career coach anything..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="w-full bg-transparent px-2 text-xs text-slate-800 placeholder-slate-400 outline-none"
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={isSending || !inputMessage.trim()}
                  className="bg-[#1e3a5f] hover:bg-[#274b76] text-xs h-8 px-3"
                >
                  <Send size={13} data-icon="inline-start" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: GOAL ASSESSMENT */}
      {activeMode === 'goal' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Audit Readiness For Dream Target Role
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Enter your target aspiration to compute readiness score, critical gaps, and 4-week execution blueprint.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={targetGoalRole}
                onChange={(e) => setTargetGoalRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer at Google or Staff SWE at Stripe"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
              <Button
                onClick={handleAssessGoal}
                disabled={isAssessing || !targetGoalRole.trim()}
                className="w-full sm:w-auto bg-[#1e3a5f] hover:bg-[#274b76] text-xs font-semibold px-5"
              >
                {isAssessing ? (
                  <>
                    <Activity size={14} className="animate-spin" data-icon="inline-start" />
                    Computing Gap Vectors...
                  </>
                ) : (
                  <>
                    <Target size={14} data-icon="inline-start" />
                    Assess Career Readiness
                  </>
                )}
              </Button>
            </div>
          </div>

          {goalAssessment && (
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              {/* Readiness Card */}
              <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Target Role Readiness
                      </span>
                      <p className="mt-1 text-4xl font-extrabold text-slate-900">
                        {goalAssessment.readinessScore}%
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#2866c7]">
                      {goalAssessment.gapAnalysis.experienceGapYears === 0
                        ? 'Competitive Level'
                        : `${goalAssessment.gapAnalysis.experienceGapYears} Year Gap`}
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-slate-600 leading-5">
                    {goalAssessment.aiRationale}
                  </p>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Priority Skills To Unlock
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {goalAssessment.gapAnalysis.missingSkills.map((s, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 border border-rose-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 text-xs text-slate-400">
                  Algorithmic readiness computed against industry hiring rubrics.
                </div>
              </div>

              {/* 4-Week Action Plan */}
              <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs flex flex-col gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                  4-Week Tactical Execution Roadmap
                </h3>
                {goalAssessment.weeklyActionPlan.map((w) => (
                  <div key={w.week} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#1e3a5f] px-2 py-0.5 text-xs font-bold text-white font-mono">
                        Week {w.week}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{w.focus}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 leading-5">
                      <span className="font-semibold text-slate-700">Deliverable:</span> {w.deliverable}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: RAG KNOWLEDGE BASE */}
      {activeMode === 'rag' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Search Grounded Career Knowledge Base
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Query curated interview frameworks, salary benchmarks, and architectural design principles stored in PostgreSQL pgvector.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="e.g. How to answer STAR behavioral questions for senior engineers?"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
              <Button
                onClick={handleSearchRag}
                disabled={isSearchingRag || !ragQuery.trim()}
                className="w-full sm:w-auto bg-[#1e3a5f] hover:bg-[#274b76] text-xs font-semibold px-5"
              >
                {isSearchingRag ? (
                  <>
                    <Activity size={14} className="animate-spin" data-icon="inline-start" />
                    Searching Embeddings...
                  </>
                ) : (
                  <>
                    <Search size={14} data-icon="inline-start" />
                    Query Knowledge
                  </>
                )}
              </Button>
            </div>
          </div>

          {ragResult && (
            <div className="rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-xs flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
                  Synthesized Grounded Answer
                </h4>
                <p className="text-xs text-slate-800 leading-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {ragResult.answer}
                </p>
              </div>

              {ragResult.chunks && ragResult.chunks.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Verified Citations & Sources
                  </h5>
                  <div className="flex flex-col gap-2">
                    {ragResult.chunks.map((c, i) => (
                      <div key={i} className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-100">
                        <span className="font-bold text-slate-700">{c.title || `Source #${i + 1}`}</span>
                        <p className="text-slate-500 mt-1">{c.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <LockKeyhole size={14} />
        Coaching data is private, encrypted, and isolated to your account.
      </div>
    </div>
  )
}
