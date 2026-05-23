'use client'

import { useState, useEffect, useCallback } from 'react'

const TIMES = [
  '10:00','10:30','11:00','11:30','12:00','12:30','13:00',
  '13:30','14:00','14:30','15:00','15:30','16:00','16:30'
]
const DAYS = ['日','月','火','水','木','金','土']

type Step = 1 | 2 | 3 | 4 | 5 | 6
type Avail = Record<string, { booked: number; capacity: number }>

export default function Home() {
  const [tab, setTab] = useState<'user' | 'admin'>('user')
  const [step, setStep] = useState<Step>(1)

  const [selType, setSelType] = useState<2 | 4 | null>(null)
  const [curYear, setCurYear] = useState(new Date().getFullYear())
  const [curMonth, setCurMonth] = useState(new Date().getMonth())
  const [selDate, setSelDate] = useState<string | null>(null)
  const [selTime, setSelTime] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [availability, setAvailability] = useState<Avail>({})
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [completedResv, setCompletedResv] = useState<{number:string;date:string;time:string;name:string} | null>(null)

  const [cancelNum, setCancelNum] = useState('')
  const [cancelNum2, setCancelNum2] = useState('')
  const [cancelMsg, setCancelMsg] = useState<{ok:boolean;text:string} | null>(null)
  const [cancelMsg2, setCancelMsg2] = useState<{ok:boolean;text:string} | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [adminLoggedIn, setAdminLoggedIn] = useState(false)
  const [adminTab, setAdminTab] = useState<'settings' | 'list' | 'calendar'>('calendar')
  const [settings, setSettings] = useState<Record<string, Record<number,number>>>({})
  const [adminResvs, setAdminResvs] = useState<any[]>([])
  const [filterDate, setFilterDate] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  // 営業日関連
  const [businessDays, setBusinessDays] = useState<Set<string>>(new Set())
  const [adminCalYear, setAdminCalYear] = useState(new Date().getFullYear())
  const [adminCalMonth, setAdminCalMonth] = useState(new Date().getMonth())
  const [calUpdating, setCalUpdating] = useState<string | null>(null)

  const fetchAvailability = useCallback(async (date: string) => {
    setLoadingAvail(true)
    try {
      const res = await fetch(`/api/availability?date=${date}`)
      const data = await res.json()
      setAvailability(data.availability || {})
    } catch { setAvailability({}) }
    setLoadingAvail(false)
  }, [])

  useEffect(() => {
    if (selDate && step === 3) fetchAvailability(selDate)
  }, [selDate, step, fetchAvailability])

  // ユーザーカレンダー用：表示中の月の営業日を取得
  const fetchBusinessDays = useCallback(async (year: number, month: number) => {
    try {
      const res = await fetch(`/api/business-days?year=${year}&month=${month+1}`)
      const data = await res.json()
      setBusinessDays(new Set(data.dates || []))
    } catch { setBusinessDays(new Set()) }
  }, [])

  useEffect(() => {
    fetchBusinessDays(curYear, curMonth)
  }, [curYear, curMonth, fetchBusinessDays])

  // 管理者カレンダー用
  const [adminBusinessDays, setAdminBusinessDays] = useState<Set<string>>(new Set())
  const fetchAdminBusinessDays = useCallback(async (year: number, month: number) => {
    try {
      const res = await fetch(`/api/business-days?year=${year}&month=${month+1}`)
      const data = await res.json()
      setAdminBusinessDays(new Set(data.dates || []))
    } catch { setAdminBusinessDays(new Set()) }
  }, [])

  useEffect(() => {
    if (adminLoggedIn && adminTab === 'calendar') {
      fetchAdminBusinessDays(adminCalYear, adminCalMonth)
    }
  }, [adminLoggedIn, adminTab, adminCalYear, adminCalMonth, fetchAdminBusinessDays])

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings')
    const data = await res.json()
    const map: Record<string, Record<number,number>> = {}
    data.settings?.forEach((s: any) => {
      if (!map[s.time]) map[s.time] = {}
      map[s.time][s.slot_type] = s.capacity
    })
    setSettings(map)
  }, [])

  const fetchAdminResvs = useCallback(async () => {
    setAdminLoading(true)
    const res = await fetch(`/api/reservations${filterDate ? `?date=${filterDate}` : ''}`, {
      headers: { 'x-admin-pin': pin }
    })
    const data = await res.json()
    setAdminResvs(data.reservations || [])
    setAdminLoading(false)
  }, [pin, filterDate])

  useEffect(() => {
    if (adminLoggedIn && adminTab === 'list') fetchAdminResvs()
  }, [adminLoggedIn, adminTab, filterDate, fetchAdminResvs])

  useEffect(() => {
    if (adminLoggedIn && adminTab === 'settings') fetchSettings()
  }, [adminLoggedIn, adminTab, fetchSettings])

  function goStep(n: Step) { setStep(n); setSubmitError('') }

  function changeMonth(d: number) {
    let m = curMonth + d, y = curYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCurMonth(m); setCurYear(y)
  }

  function changeAdminCalMonth(d: number) {
    let m = adminCalMonth + d, y = adminCalYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setAdminCalMonth(m); setAdminCalYear(y)
  }

  const today = new Date(); today.setHours(0,0,0,0)

  function renderCalendar() {
    const first = new Date(curYear, curMonth, 1).getDay()
    const days = new Date(curYear, curMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < first; i++) cells.push(<div key={'e'+i} />)
    for (let d = 1; d <= days; d++) {
      const ds = `${curYear}-${String(curMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const dt = new Date(curYear, curMonth, d)
      const past = dt < today
      const isOpen = businessDays.has(ds)
      const disabled = past || !isOpen
      const sel = selDate === ds
      cells.push(
        <button key={ds} onClick={() => { if (!disabled) { setSelDate(ds); setSelTime(null) } }}
          disabled={disabled}
          className={`aspect-square rounded-lg border text-sm flex items-center justify-center transition-all
            ${disabled ? 'opacity-30 cursor-default bg-stone-100' : 'cursor-pointer hover:bg-stone-50'}
            ${sel ? 'bg-teal-50 border-teal-500 text-teal-800 font-medium' : 'border-stone-200 text-stone-700'}
            ${!disabled && isOpen ? 'ring-1 ring-teal-200' : ''}`}
        >{d}</button>
      )
    }
    return cells
  }

  async function toggleBusinessDay(date: string) {
    const isOpen = adminBusinessDays.has(date)
    setCalUpdating(date)
    try {
      await fetch('/api/business-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ date, open: !isOpen }),
      })
      setAdminBusinessDays(prev => {
        const next = new Set(prev)
        if (isOpen) next.delete(date)
        else next.add(date)
        return next
      })
    } catch {}
    setCalUpdating(null)
  }

  function renderAdminCalendar() {
    const first = new Date(adminCalYear, adminCalMonth, 1).getDay()
    const days = new Date(adminCalYear, adminCalMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < first; i++) cells.push(<div key={'e'+i} />)
    for (let d = 1; d <= days; d++) {
      const ds = `${adminCalYear}-${String(adminCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const isOpen = adminBusinessDays.has(ds)
      const updating = calUpdating === ds
      cells.push(
        <button key={ds} onClick={() => toggleBusinessDay(ds)}
          disabled={updating}
          className={`aspect-square rounded-lg border text-sm flex items-center justify-center transition-all font-medium
            ${updating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            ${isOpen
              ? 'bg-teal-500 border-teal-500 text-white hover:bg-teal-600'
              : 'bg-white border-stone-200 text-stone-400 hover:bg-stone-50'}`}
        >{d}</button>
      )
    }
    return cells
  }

  async function submitReservation() {
    setSubmitting(true); setSubmitError('')
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selDate, time: selTime, slotType: selType, name, phone }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error || 'エラーが発生しました'); setSubmitting(false); return }
      setCompletedResv({ number: data.reservation.reservation_number, date: selDate!, time: selTime!, name })
      goStep(6)
    } catch { setSubmitError('通信エラーが発生しました') }
    setSubmitting(false)
  }

  async function doCancel(num: string, setter: (v: any) => void) {
    setCancelLoading(true)
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationNumber: num }),
      })
      const data = await res.json()
      if (!res.ok) setter({ ok: false, text: data.error || '予約が見つかりません' })
      else setter({ ok: true, text: `${data.reservation.date.replace(/-/g,'/')} ${data.reservation.time}（${data.reservation.name}様）の予約をキャンセルしました。` })
    } catch { setter({ ok: false, text: '通信エラーが発生しました' }) }
    setCancelLoading(false)
  }

  function adminLogin() {
    if (pin === process.env.NEXT_PUBLIC_ADMIN_PIN || pin === '0329') {
      setAdminLoggedIn(true); setPinError(false)
    } else { setPinError(true); setPin('') }
  }

  async function updateCapacity(time: string, slotType: number, delta: number) {
    const cur = settings[time]?.[slotType] ?? 0
    const next = Math.max(0, Math.min(10, cur + delta))
    setSettings(prev => ({ ...prev, [time]: { ...prev[time], [slotType]: next } }))
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ time, slotType, capacity: next }),
    })
  }

  async function adminCancel(reservationNumber: string) {
    if (!confirm('この予約をキャンセルしますか？')) return
    await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationNumber }),
    })
    fetchAdminResvs()
  }

  function resetAll() {
    setStep(1); setSelType(null); setSelDate(null); setSelTime(null)
    setName(''); setPhone(''); setAvailability({})
    setSubmitError(''); setCompletedResv(null)
    setCancelMsg(null); setCancelMsg2(null); setCancelNum(''); setCancelNum2('')
  }

  const monthLabel = `${curYear}年${curMonth+1}月`
  const adminMonthLabel = `${adminCalYear}年${adminCalMonth+1}月`

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-stone-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-5 text-center">
          <div className="text-4xl mb-1">🍧</div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-wide">かき氷予約</h1>
          <p className="text-xs text-stone-400 mt-1">完全予約制</p>
        </div>

        <div className="flex gap-2 mb-5">
          {(['user','admin'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-colors
                ${tab===t ? 'bg-teal-50 border-teal-400 text-teal-700 font-medium' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
              {t==='user' ? '予約する' : '管理者'}
            </button>
          ))}
        </div>

        {tab === 'user' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-stone-800 mb-1">枠を選んでください</h2>
                <p className="text-xs text-stone-400 mb-4">ご注文予定のかき氷の数でお選びください</p>
                <div className="grid grid-cols-2 gap-3">
                  {([2,4] as const).map(t => (
                    <button key={t} onClick={() => { setSelType(t); goStep(2) }}
                      className="border border-stone-200 rounded-xl p-4 text-left hover:bg-teal-50 hover:border-teal-300 transition-all">
                      <div className="text-2xl font-bold text-teal-600 mb-1">{t}杯</div>
                      <div className="text-xs text-stone-500">{t}杯までの枠</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <button onClick={() => goStep(1)} className="text-xs text-stone-400 mb-3 hover:text-stone-600">← 戻る</button>
                <h2 className="text-base font-semibold text-stone-800 mb-1">日付を選んでください</h2>
                <p className="text-xs text-stone-400 mb-4">営業日のみ選択できます</p>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 text-sm">◀</button>
                  <span className="text-sm font-medium text-stone-700">{monthLabel}</span>
                  <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 text-sm">▶</button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAYS.map(d => <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendar()}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-4 h-4 rounded border border-stone-200 bg-stone-100" />
                  <span className="text-xs text-stone-400">予約不可</span>
                  <div className="w-4 h-4 rounded border border-teal-300 bg-white ring-1 ring-teal-200 ml-3" />
                  <span className="text-xs text-stone-400">予約可能</span>
                </div>
                {selDate && (
                  <button onClick={() => goStep(3)}
                    className="w-full mt-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                    {selDate.replace(/-/g,'/')} で時間を選ぶ →
                  </button>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <button onClick={() => goStep(2)} className="text-xs text-stone-400 mb-3 hover:text-stone-600">← 戻る</button>
                <h2 className="text-base font-semibold text-stone-800 mb-1">時間を選んでください</h2>
                <p className="text-xs text-stone-400 mb-4">{selDate?.replace(/-/g,'/')}　{selType}杯枠</p>
                {loadingAvail ? <p className="text-sm text-stone-400 py-4">読み込み中...</p> : (
                  <div className="grid grid-cols-3 gap-2">
                    {TIMES.map(t => {
                      const key = `${t}_${selType}`
                      const av = availability[key]
                      const full = av ? av.booked >= av.capacity : false
                      const noSlot = !av || av.capacity === 0
                      const disabled = full || noSlot
                      const sel = selTime === t
                      return (
                        <button key={t} onClick={() => !disabled && setSelTime(t)} disabled={disabled}
                          className={`py-2.5 rounded-lg border text-sm transition-all
                            ${disabled ? 'opacity-30 cursor-default bg-stone-100 border-stone-200 text-stone-400' : 'cursor-pointer'}
                            ${sel ? 'bg-teal-50 border-teal-500 text-teal-800 font-medium' : (!disabled ? 'border-stone-200 text-stone-700 hover:bg-stone-50' : '')}`}>
                          {t}
                          {!noSlot && av && <span className="block text-xs mt-0.5 opacity-60">{av.capacity - av.booked}組</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
                {selTime && (
                  <button onClick={() => goStep(4)}
                    className="w-full mt-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                    {selTime} で進む →
                  </button>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <button onClick={() => goStep(3)} className="text-xs text-stone-400 mb-3 hover:text-stone-600">← 戻る</button>
                <h2 className="text-base font-semibold text-stone-800 mb-4">お名前を入力してください</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1.5">お名前 <span className="text-red-400">*</span></label>
                    <input value={name} onChange={e => setName(e.target.value)}
                      placeholder="山田 花子"
                      className="w-full h-10 px-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 text-stone-800" />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1.5">電話番号 <span className="text-red-400">*</span></label>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="090-0000-0000" type="tel"
                      className="w-full h-10 px-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 text-stone-800" />
                  </div>
                </div>
                <button onClick={() => goStep(5)} disabled={!name.trim() || !phone.trim()}
                  className="w-full mt-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-teal-700 transition-colors">
                  確認画面へ →
                </button>
              </div>
            )}

            {step === 5 && (
              <div>
                <button onClick={() => goStep(4)} className="text-xs text-stone-400 mb-3 hover:text-stone-600">← 戻る</button>
                <h2 className="text-base font-semibold text-stone-800 mb-4">予約内容の確認</h2>
                <div className="bg-stone-50 rounded-xl p-4 mb-4 space-y-2.5">
                  {([
                    ['枠', `${selType}杯枠`],
                    ['日付', selDate?.replace(/-/g,'/')],
                    ['時間', selTime],
                    ['お名前', name],
                    ['電話番号', phone],
                  ] as [string, string][]).map(([l,v]) => (
                    <div key={l} className="flex justify-between text-sm border-b border-stone-200 pb-2 last:border-0 last:pb-0">
                      <span className="text-stone-500">{l}</span>
                      <span className="font-medium text-stone-800">{v}</span>
                    </div>
                  ))}
                </div>
                {submitError && <p className="text-sm text-red-500 mb-3">{submitError}</p>}
                <button onClick={submitReservation} disabled={submitting}
                  className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-teal-700 transition-colors">
                  {submitting ? '送信中...' : 'この内容で予約する'}
                </button>
              </div>
            )}

            {step === 6 && completedResv && (
              <div>
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">✅</div>
                  <h2 className="text-lg font-semibold text-stone-800 mb-2">予約が完了しました！</h2>
                  <p className="text-sm text-stone-500">{completedResv.date.replace(/-/g,'/')} {completedResv.time}</p>
                  <p className="text-sm font-medium text-stone-700 mt-1">{completedResv.name} 様</p>
                  <div className="mt-4 inline-block bg-teal-50 rounded-xl px-6 py-3">
                    <p className="text-xs text-stone-500 mb-1">予約番号（キャンセル時に必要）</p>
                    <p className="text-2xl font-semibold text-teal-700 tracking-widest">{completedResv.number}</p>
                  </div>
                  <div className="mt-4">
                    <button onClick={resetAll} className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                      新しく予約する
                    </button>
                  </div>
                </div>
                <CancelBox num={cancelNum} setNum={setCancelNum} msg={cancelMsg} setMsg={setCancelMsg} loading={cancelLoading} onCancel={(n) => doCancel(n, setCancelMsg)} />
              </div>
            )}

            {step < 6 && (
              <CancelBox num={cancelNum2} setNum={setCancelNum2} msg={cancelMsg2} setMsg={setCancelMsg2} loading={cancelLoading} onCancel={(n) => doCancel(n, setCancelMsg2)} />
            )}
          </div>
        )}

        {tab === 'admin' && (
          <div>
            {!adminLoggedIn ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 max-w-xs">
                <p className="text-sm font-medium text-stone-700 mb-3">管理者ログイン</p>
                <label className="block text-xs text-stone-500 mb-1.5">PINコード</label>
                <input value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key==='Enter' && adminLogin()}
                  placeholder="****" maxLength={4} type="password"
                  className={`w-full h-9 px-3 border rounded-lg text-sm mb-3 focus:outline-none text-stone-800
                    ${pinError ? 'border-red-300' : 'border-stone-200 focus:border-teal-400'}`} />
                {pinError && <p className="text-xs text-red-500 mb-2">PINコードが違います</p>}
                <button onClick={adminLogin} className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">ログイン</button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-stone-800">管理パネル</h2>
                  <button onClick={() => { setAdminLoggedIn(false); setPin('') }} className="text-xs text-stone-500 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50">ログアウト</button>
                </div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {(['calendar','settings','list'] as const).map(t => (
                    <button key={t} onClick={() => setAdminTab(t)}
                      className={`px-4 py-1.5 rounded-lg text-sm border transition-colors
                        ${adminTab===t ? 'bg-teal-50 border-teal-400 text-teal-700 font-medium' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                      {t==='calendar' ? '📅 営業日設定' : t==='settings' ? '枠の設定' : '予約一覧'}
                    </button>
                  ))}
                </div>

                {adminTab === 'calendar' && (
                  <div>
                    <p className="text-xs text-stone-400 mb-3">日付をタップして営業日をON/OFFします。<span className="text-teal-600 font-medium">緑の日付</span>が営業日です。</p>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => changeAdminCalMonth(-1)} className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 text-sm">◀</button>
                      <span className="text-sm font-medium text-stone-700">{adminMonthLabel}</span>
                      <button onClick={() => changeAdminCalMonth(1)} className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 text-sm">▶</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {DAYS.map(d => <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {renderAdminCalendar()}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-teal-500" />
                        <span className="text-xs text-stone-500">営業日（予約可）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-stone-200 bg-white" />
                        <span className="text-xs text-stone-500">休業日（予約不可）</span>
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === 'settings' && (
                  <div>
                    <p className="text-xs text-stone-400 mb-3">時間帯ごとの受付組数。0で受付停止になります。</p>
                    <div className="grid grid-cols-2 gap-3">
                      {([2,4] as const).map(tp => (
                        <div key={tp} className="border border-stone-200 rounded-xl p-3">
                          <h3 className="text-xs text-stone-500 mb-2">{tp}杯枠（組数）</h3>
                          <div className="space-y-1">
                            {TIMES.map(t => {
                              const v = settings[t]?.[tp] ?? 2
                              return (
                                <div key={t} className="flex items-center justify-between py-1 border-b border-stone-100 last:border-0">
                                  <span className="text-xs text-stone-700">{t}</span>
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => updateCapacity(t, tp, -1)} className="w-6 h-6 border border-stone-200 rounded text-stone-500 hover:bg-stone-50 text-sm flex items-center justify-center">−</button>
                                    <span className="text-sm font-medium text-stone-800 w-5 text-center">{v}</span>
                                    <button onClick={() => updateCapacity(t, tp, 1)} className="w-6 h-6 border border-stone-200 rounded text-stone-500 hover:bg-stone-50 text-sm flex items-center justify-center">＋</button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminTab === 'list' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-xs text-stone-500">日付で絞り込み：</label>
                      <input value={filterDate} onChange={e => setFilterDate(e.target.value)} placeholder="2025-06-01"
                        className="h-8 px-2 border border-stone-200 rounded-lg text-xs text-stone-700 focus:outline-none w-32" />
                    </div>
                    {adminLoading ? <p className="text-sm text-stone-400 py-4">読み込み中...</p>
                    : adminResvs.length === 0 ? <p className="text-sm text-stone-400 py-4">予約はありません</p>
                    : (
                      <div className="space-y-2">
                        {adminResvs.map(r => (
                          <div key={r.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                            <div>
                              <div className="text-sm font-medium text-stone-800">{r.name}</div>
                              <div className="text-xs text-stone-500 mt-0.5">{r.date.replace(/-/g,'/')} {r.time}　{r.slot_type}杯枠　{r.reservation_number}</div>
                            </div>
                            <button onClick={() => adminCancel(r.reservation_number)}
                              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors">
                              キャンセル
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </main>
  )
}

function CancelBox({ num, setNum, msg, setMsg, loading, onCancel }: {
  num: string, setNum: (v: string) => void
  msg: {ok:boolean;text:string} | null, setMsg: (v: any) => void
  loading: boolean, onCancel: (n: string) => void
}) {
  return (
    <div className="mt-6 pt-5 border-t border-stone-100">
      <p className="text-xs text-stone-500 mb-2">予約済みの方はこちら（予約番号でキャンセル）</p>
      <div className="flex gap-2">
        <input value={num} onChange={e => { setNum(e.target.value); setMsg(null) }}
          placeholder="予約番号 例: K4521"
          className="flex-1 h-9 px-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 text-stone-800" />
        <button onClick={() => onCancel(num)} disabled={!num.trim() || loading}
          className="px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-40 whitespace-nowrap">
          キャンセル
        </button>
      </div>
      {msg && (
        <div className={`mt-2 px-3 py-2 rounded-lg text-xs ${msg.ok ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}
    </div>
  )
}
