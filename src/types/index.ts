// 데이터 모델 타입 (PLAN.md 4장 기준)

export type ProjectStatus = 'active' | 'paused' | 'done'
export type GoalPeriod = 'weekly' | 'monthly'
export type LogType = '작업' | '결정' | '이슈'

export interface Project {
  id: string
  name: string
  description: string | null
  category: string | null
  status: ProjectStatus
  progress: number
  // 프로젝트별 자유 데이터. 구조가 정해져 있지 않아 unknown 으로 받고 렌더링 시 분기.
  custom_fields: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface RecurringGoal {
  id: string
  project_id: string
  label: string
  period: GoalPeriod
  target_count: number
  current_count: number
  period_start: string
}

export interface ProgressLog {
  id: string
  project_id: string
  log_date: string
  log_type: LogType
  content: string
}
