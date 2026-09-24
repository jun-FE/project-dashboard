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

// 프로젝트의 개별 작업물 (쿠팡 리뷰 한 건 등). 테이블 정의는 supabase/06_project_items.sql
export type ItemStage = 'queued' | 'drafted' | 'published'

export interface ProjectItem {
  id: string
  project_id: string
  external_key: string
  title: string
  stage: ItemStage
  body: string | null
  notes: string | null
  // 쿠팡: { comment: 한줄평, photos: 사진 수 }
  meta: { comment?: string; photos?: number } & Record<string, unknown>
  created_at: string
  drafted_at: string | null
  published_at: string | null
}

// 메모봇(텔레그램)이 쌓는 메모. 테이블 정의는 ~/latte-factory/memo-bot/supabase/
export type MemoKind = 'note' | 'todo' | 'event' | 'question' | 'link'
export type TodoStatus = 'open' | 'done' | 'archived'

export interface MemoAttachment {
  type: string
  path: string | null
}

export interface Memo {
  id: string
  content: string
  link_title: string | null
  // 링크 요약 (레시피는 재료·순서). '' = 요약할 정보가 없었음
  link_summary: string | null
  attachments: MemoAttachment[]
  created_at: string
  category: string | null
  tags: string[]
  kind: MemoKind | null
  todo_status: TodoStatus | null
  due_at: string | null
  calendar_event_id: string | null
  ai_note: string | null
  processed_at: string | null
}
