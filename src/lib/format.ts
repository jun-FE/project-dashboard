// 상대 시간 표시: "방금 전", "2시간 전", "3일 전" ...
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.floor((Date.now() - then) / 1000)

  if (diffSec < 60) return '방금 전'
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}일 전`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month}개월 전`
  return `${Math.floor(month / 12)}년 전`
}

// 오늘 로그의 시각만 "14:30" 형태로
export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// 타임라인용 "6월 3일 14:30" 형태
export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
