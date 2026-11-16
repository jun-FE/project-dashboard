import { supabase } from './supabase'

// 프로젝트 체크리스트 (테이블: supabase/13_project_tasks.sql). custom_fields.module = 'launch' 인 프로젝트가 쓴다.
export type Who = 'me' | 'claude'

export interface ProjectTask {
  id: string
  project_id: string
  section: string
  sort: number
  title: string
  detail: string | null
  who: Who | null
  counts: boolean // false 면 진행률에서 뺀다 (출시 후 항목)
  done: boolean
  done_at: string | null
  created_at: string
}

export async function fetchTasks(projectId: string): Promise<ProjectTask[]> {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort')
    .order('created_at')
  if (error) throw error
  return data as ProjectTask[]
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('project_tasks')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function addTask(task: Pick<ProjectTask, 'project_id' | 'section' | 'sort' | 'title' | 'who' | 'counts'>): Promise<ProjectTask> {
  const { data, error } = await supabase.from('project_tasks').insert(task).select().single()
  if (error) throw error
  return data as ProjectTask
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('project_tasks').delete().eq('id', id)
  if (error) throw error
}

export function taskStats(tasks: ProjectTask[]) {
  const counted = tasks.filter((t) => t.counts)
  const done = counted.filter((t) => t.done).length
  const by = (w: Who) => {
    const list = counted.filter((t) => t.who === w)
    return { done: list.filter((t) => t.done).length, total: list.length }
  }
  return {
    done,
    total: counted.length,
    percent: counted.length ? Math.round((done / counted.length) * 100) : 0,
    me: by('me'),
    claude: by('claude'),
  }
}
