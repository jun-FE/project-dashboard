import { supabase } from './supabase'
import type { Project, RecurringGoal, ProgressLog, ProjectStatus, LogType } from '../types'

export interface DashboardData {
  projects: Project[]
  // 프로젝트 id → 정기 목표 목록
  goalsByProject: Record<string, RecurringGoal[]>
  // 프로젝트 id → 오늘 작성된 로그 (최신순)
  todayLogsByProject: Record<string, ProgressLog[]>
}

// 로컬 자정(00:00) 시각을 ISO 문자열로. "오늘" 경계 기준.
function startOfTodayISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// 대시보드에 필요한 데이터를 3번의 조회로 가져와 프로젝트별로 묶는다.
// (프로젝트 수가 적은 개인용이라 단순한 분리 조회 + 클라이언트 조합이 읽기 쉽다.)
export async function fetchDashboardData(): Promise<DashboardData> {
  const todayStart = startOfTodayISO()

  const [projectsRes, goalsRes, logsRes] = await Promise.all([
    supabase.from('projects').select('*').order('updated_at', { ascending: false }),
    supabase.from('recurring_goals').select('*'),
    supabase
      .from('progress_logs')
      .select('*')
      .gte('log_date', todayStart)
      .order('log_date', { ascending: false }),
  ])

  if (projectsRes.error) throw projectsRes.error
  if (goalsRes.error) throw goalsRes.error
  if (logsRes.error) throw logsRes.error

  const projects = (projectsRes.data ?? []) as Project[]
  const goals = (goalsRes.data ?? []) as RecurringGoal[]
  const todayLogs = (logsRes.data ?? []) as ProgressLog[]

  const goalsByProject: Record<string, RecurringGoal[]> = {}
  for (const g of goals) {
    ;(goalsByProject[g.project_id] ??= []).push(g)
  }

  const todayLogsByProject: Record<string, ProgressLog[]> = {}
  for (const l of todayLogs) {
    ;(todayLogsByProject[l.project_id] ??= []).push(l)
  }

  return { projects, goalsByProject, todayLogsByProject }
}

export interface ProjectDetail {
  project: Project
  goals: RecurringGoal[]
  logs: ProgressLog[] // 전체 로그, 최신순 (타임라인용)
}

// 상세 페이지: 단일 프로젝트 + 정기목표 + 진행로그 전체.
export async function fetchProjectDetail(id: string): Promise<ProjectDetail> {
  const [projectRes, goalsRes, logsRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('recurring_goals').select('*').eq('project_id', id),
    supabase
      .from('progress_logs')
      .select('*')
      .eq('project_id', id)
      .order('log_date', { ascending: false }),
  ])

  if (projectRes.error) throw projectRes.error
  if (goalsRes.error) throw goalsRes.error
  if (logsRes.error) throw logsRes.error

  return {
    project: projectRes.data as Project,
    goals: (goalsRes.data ?? []) as RecurringGoal[],
    logs: (logsRes.data ?? []) as ProgressLog[],
  }
}

// ---- 화면에서 수정 (RLS 로 로그인한 본인만 가능) ----

// status/progress 등 공통 컬럼 수정. updated_at 은 DB 트리거가 갱신한다.
export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, 'status' | 'progress'>>,
): Promise<Project> {
  const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Project
}

// 정기 목표 ±. DB 에서 원자적으로 더하고 프로젝트 updated_at 도 갱신한다. (supabase/05_bump_goal.sql)
export async function bumpGoal(goalId: string, delta: number): Promise<number> {
  const { data, error } = await supabase.rpc('bump_goal', { goal_id: goalId, delta })
  if (error) throw error
  return data as number
}

// 로그를 남기면 그 프로젝트의 "마지막 업데이트"도 갱신한다. (값은 트리거가 now() 로 덮어씀)
export async function addLog(projectId: string, logType: LogType, content: string): Promise<ProgressLog> {
  const { data, error } = await supabase
    .from('progress_logs')
    .insert({ project_id: projectId, log_type: logType, content })
    .select()
    .single()
  if (error) throw error
  await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', projectId)
  return data as ProgressLog
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('progress_logs').delete().eq('id', id)
  if (error) throw error
}

export const PROJECT_STATUSES: ProjectStatus[] = ['active', 'paused', 'done']
export const LOG_TYPES: LogType[] = ['작업', '결정', '이슈']
