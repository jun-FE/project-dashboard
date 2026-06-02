import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // 빌드는 통과하되, 런타임에 .env.local 누락을 바로 알 수 있게 경고.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없습니다. .env.local 을 확인하세요.',
  )
}

export const supabase = createClient(url, anonKey)
