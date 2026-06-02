// custom_fields(JSONB) 동적 렌더링.
// 정해진 스키마가 없으므로 값 타입에 따라 보기 좋게 분기하고,
// 모르는 형태는 key-value 로 단순 표시한다. (PLAN 3.2 / 5장)

function formatPrimitive(v: string | number | boolean): string {
  if (typeof v === 'number') return v.toLocaleString('ko-KR')
  if (typeof v === 'boolean') return v ? '예' : '아니오'
  return v
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">—</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">없음</span>
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, i) => (
          <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-700">
            {typeof item === 'object' ? JSON.stringify(item) : formatPrimitive(item)}
          </span>
        ))}
      </div>
    )
  }
  if (typeof value === 'object') {
    // 중첩 객체는 key: value 들을 줄바꿈으로
    return (
      <div className="space-y-0.5">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="text-sm text-slate-700">
            <span className="text-slate-400">{k}: </span>
            {typeof v === 'object' ? JSON.stringify(v) : formatPrimitive(v as never)}
          </div>
        ))}
      </div>
    )
  }
  return <span className="text-sm font-medium text-slate-800">{formatPrimitive(value as never)}</span>
}

export default function CustomFields({ fields }: { fields: Record<string, unknown> }) {
  const entries = Object.entries(fields ?? {})
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">추가 정보 없음</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-1 text-xs text-slate-500">{key}</p>
          {renderValue(value)}
        </div>
      ))}
    </div>
  )
}
