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
  const [email, setEmail] = useState('')
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
  const [adminTab, setAdminTab] = useState<'settings' | 'list'>('settings')
  const [settings, setSettings] = useState<Record<string, Record<number,number>>>({})
  const [adminResvs, setAdminResvs] = useState<any[]>([])
  const [filterDate, setFilterDate] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

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
      const sel = selDate === ds
      cells.push(
        <button key={ds} onClick={() => { setSelDate(ds); setSelTime(null) }}
          disabled={past}
          className={`aspect-square rounded-lg border text-sm flex items-center justify-center transition-all
            ${past ? 'opacity-30 cursor-default' : 'cursor-pointer hover:bg-stone-50'}
            ${sel ? 'bg-teal-50 border-teal-500 text-teal-800 font-medium' : 'border-stone-200 text-stone-700'}`}
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
        body: JSON.stringify({ date: selDate, time: selTime, slotType: selType, name, email }),
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
    if (pin === ('0329')) { setAdminLoggedIn(true); setPinError(false) }
    else { setPinError(true); setPin('') }
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

  async function adminCancel(num: string) {
    await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationNumber: num }),
    })
    fetchAdminResvs()
  }

  function resetAll() {
    setSelType(null); setSelDate(null); setSelTime(null)
    setName(''); setEmail(''); setAvailability({})
    setCompletedResv(null); setCancelMsg(null); setCancelMsg2(null)
    setCancelNum(''); setCancelNum2('')
    goStep(1)
  }

  const progDots = [1,2,3,4,5]

  return (
    <main className="min-h-screen bg-stone-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🍧</span>
            <h1 className="text-xl font-semibold text-stone-800">かき氷予約</h1>
          </div>
          <p className="text-sm text-stone-500 mb-4">完全予約制 ／ 10:00〜17:00</p>
          <div className="flex border-b border-stone-200">
            {(['user','admin'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-sm border-b-2 transition-colors
                  ${tab===t ? 'border-teal-500 text-teal-700 font-medium' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
                {t==='user' ? '予約する' : '管理者'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
        {tab === 'user' && (
          <div>
            {step < 6 && (
              <div className="flex gap-1.5 mb-5">
                {progDots.map(i => (
                  <div key={i} className={`flex-1 h-1 rounded-full transition-colors
                    ${i < step ? 'bg-teal-500' : i === step ? 'bg-teal-300' : 'bg-stone-200'}`} />
                ))}
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-xs text-stone-400 mb-3">ステップ 1 / 5　枠の種類を選んでください</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {([2,4] as const).map(tp => (
                    <button key={tp} onClick={() => setSelType(tp)}
                      className={`border rounded-xl p-5 text-left transition-all
                        ${selType===tp ? 'border-teal-500 bg-teal-50 border-2' : 'border-stone-200 hover:border-teal-300'}`}>
                      <div className="text-2xl mb-2">{tp===2 ? '🍧' : '👨‍👩‍👧‍👦'}</div>
                      <div className={`text-base font-medium mb-1 ${selType===tp ? 'text-teal-800' : 'text-stone-800'}`}>{tp}杯枠</div>
                      <div className="text-xs text-stone-500">{tp===2 ? '1組2杯まで' : '1組4杯まで（グループ向け）'}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => goStep(2)} disabled={!selType}
                  className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-teal-700 transition-colors">
                  次へ →
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <button onClick={() => goStep(1)} className="text-sm text-stone-500 hover:text-stone-700 mb-3 flex items-center gap-1">← 枠の種類に戻る</button>
                <p className="text-xs text-stone-400 mb-3">ステップ 2 / 5　日付を選んでください</p>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600">‹</button>
                  <span className="text-sm font-medium text-stone-700">{curYear}年 {curMonth+1}月</span>
                  <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-3">
                  {DAYS.map(d => <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>)}
                  {renderCalendar()}
                </div>
                <button onClick={() => goStep(3)} disabled={!selDate}
                  className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-teal-700 transition-colors">
                  次へ →
                </button>
              </div>
            )}

            {step === 3 && (
              <div>
                <button onClick={() => goStep(2)} className="text-sm text-stone-500 hover:text-stone-700 mb-3 flex items-center gap-1">← 日付に戻る</button>
                <p className="text-xs text-stone-400 mb-1">ステップ 3 / 5　時間を選んでください</p>
                <p className="text-sm font-medium text-stone-700 mb-3">{selDate?.replace(/-/g,'/')}　{selType}杯枠</p>
                {loadingAvail ? (
                  <div className="text-center py-8 text-stone-400 text-sm">読み込み中...</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {TIMES.map(t => {
                      const key = `${t}_${selType}`
                      const av = availability[key] ?? { booked: 0, capacity: 0 }
                      const full = av.booked >= av.capacity
                      const stopped = av.capacity === 0
                      const sel = selTime === t
                      return (
                        <button key={t} onClick={() => setSelTime(t)} disabled={full || stopped}
                          className={`border rounded-lg py-2 px-1 text-center transition-all
                            ${stopped ? 'border-stone-100 bg-stone-50 opacity-40 cursor-default' :
                              full ? 'border-stone-200 opacity-45 cursor-default' :
                              sel ? 'border-teal-500 bg-teal-50 border-2' : 'border-stone-200 hover:border-teal-300 cursor-pointer'}`}>
                          <div className={`text-xs font-medium ${sel ? 'text-teal-800' : 'text-stone-700'}`}>{t}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {stopped ? '受付停止' : full ? '満席' : `残${av.capacity - av.booked}組`}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                <button onClick={() => goStep(4)} disabled={!selTime}
                  className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-teal-700 transition-colors">
                  次へ →
                </button>
              </div>
            )}

            {step === 4 && (
              <div>
                <button onClick={() => goStep(3)} className="text-sm text-stone-500 hover:text-stone-700 mb-3 flex items-center gap-1">← 時間に戻る</button>
                <p className="text-xs text-stone-400 mb-3">ステップ 4 / 5　お名前・電話番号を入力してください</p>
                <div className="mb-3">
                  <label className="block text-xs text-stone-500 mb-1.5">お名前 <span className="text-red-400">*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="山田 太郎"
                    className="w-full h-9 px-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 text-stone-800" />
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-stone-500 mb-1.5">電話番号 <span className="text-red-400">*</span></label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="090-1234-5678" type="tel"
                    className="w-full h-9 px-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 text-stone-800" />
                  <p className="text-xs text-amber-600 mt-1.5 leading-relaxed">⚠️ 電話番号をご入力いただかない場合、当日の急なお知らせ（天候による営業変更など）をお伝えできない場合があります。</p>
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-stone-500 mb-1.5">メールアドレス <span className="text-stone-400">（任意・確認メール送付）</span></label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" type="email"
                    className="w-full h-9 px-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 text-stone-800" />
                </div>
                <button onClick={() => goStep(5)} disabled={!name.trim()}
                  className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-teal-700 transition-colors">
                  予約内容を確認する →
                </button>
              </div>
            )}

            {step === 5 && (
              <div>
                <button onClick={() => goStep(4)} className="text-sm text-stone-500 hover:text-stone-700 mb-3 flex items-center gap-1">← 入力に戻る</button>
                <p className="text-xs text-stone-400 mb-3">ステップ 5 / 5　予約内容の確認</p>
                <div className="bg-stone-50 rounded-xl p-4 mb-4 space-y-2.5">
                  {([
                    ['枠の種類', `${selType}杯枠`],
                    ['日付', selDate?.replace(/-/g,'/')],
                    ['時間', selTime],
                    ['お名前', name],
                    ...(email ? [['メール', email]] : []),
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
                  {email && <p className="text-xs text-stone-400 mt-3">確認メールを送付しました</p>}
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
              <div className="max-w-xs">
                <p className="text-sm font-medium text-stone-700 mb-3">管理者ログイン</p>
                <label className="block text-xs text-stone-500 mb-1.5">PINコード</label>
                <input value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key==='Enter' && adminLogin()}
                  placeholder="1234" maxLength={4} type="password"
                  className={`w-full h-9 px-3 border rounded-lg text-sm mb-3 focus:outline-none text-stone-800
                    ${pinError ? 'border-red-300' : 'border-stone-200 focus:border-teal-400'}`} />
                {pinError && <p className="text-xs text-red-500 mb-2">PINコードが違います</p>}
                <button onClick={adminLogin} className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">ログイン</button>
                <p className="text-xs text-stone-400 mt-2">※ デモ用PIN: 1234</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-stone-800">管理パネル</h2>
                  <button onClick={() => { setAdminLoggedIn(false); setPin('') }} className="text-xs text-stone-500 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50">ログアウト</button>
                </div>
                <div className="flex gap-2 mb-4">
                  {(['settings','list'] as const).map(t => (
                    <button key={t} onClick={() => setAdminTab(t)}
                      className={`px-4 py-1.5 rounded-lg text-sm border transition-colors
                        ${adminTab===t ? 'bg-teal-50 border-teal-400 text-teal-700 font-medium' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                      {t==='settings' ? '枠の設定' : '予約一覧'}
                    </button>
                  ))}
                </div>

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
