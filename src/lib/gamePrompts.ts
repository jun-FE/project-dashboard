import { supabase } from './supabase'

// 게임 메모봇이 만든 작업 프롬프트 (테이블: supabase/12_game_prompts.sql, 봇: ~/latte-factory/game-memo-bot)
export interface GamePrompt {
  id: string
  game: string
  content: string
  memo_count: number
  file_path: string | null
  done: boolean
  done_at: string | null
  created_at: string
}

export async function fetchGamePrompts(limit = 200): Promise<GamePrompt[]> {
  const { data, error } = await supabase
    .from('game_prompts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as GamePrompt[]
}

export async function setGamePromptDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('game_prompts')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

// 대시보드에서만 지운다. 맥미니의 원본 파일(Feedback/prompts)은 그대로 남는다.
export async function deleteGamePrompt(id: string): Promise<void> {
  const { error } = await supabase.from('game_prompts').delete().eq('id', id)
  if (error) throw error
}

// 프롬프트 첫 줄 "# DigDown 폰 테스트 피드백 (…)" 을 제목으로
export const promptTitle = (p: GamePrompt) => p.content.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '') ?? p.game
