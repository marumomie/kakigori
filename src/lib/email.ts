import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY || 'placeholder') }

const FROM = () => process.env.FROM_EMAIL || 'noreply@example.com'
const ADMIN = () => process.env.ADMIN_EMAIL || ''

export async function sendConfirmationEmail(to: string, data: {
  name: string; date: string; time: string; slotType: number; reservationNumber: string
}) {
  if (!to || !process.env.RESEND_API_KEY) return
  const slotLabel = data.slotType === 2 ? '2杯枠' : '4杯枠'
  await getResend().emails.send({
    from: FROM(), to,
    subject: `【予約確認】${data.date} ${data.time} - かき氷屋`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#0F6E56;">ご予約ありがとうございます</h2>
      <p>${data.name} 様のご予約を承りました。</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">日付</td><td style="font-weight:bold;">${data.date}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">時間</td><td style="font-weight:bold;">${data.time}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">枠</td><td style="font-weight:bold;">${slotLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">予約番号</td><td style="font-weight:bold;color:#1D9E75;letter-spacing:2px;">${data.reservationNumber}</td></tr>
      </table>
      <p style="font-size:13px;color:#555;background:#f5fdf9;padding:12px;border-radius:8px;">キャンセルの際は予約番号をご用意ください。</p>
    </div>`,
  })
}

export async function sendCancellationEmail(to: string, data: {
  name: string; date: string; time: string; reservationNumber: string
}) {
  if (!to || !process.env.RESEND_API_KEY) return
  await getResend().emails.send({
    from: FROM(), to,
    subject: `【キャンセル完了】${data.date} ${data.time} - かき氷屋`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#555;">予約をキャンセルしました</h2>
      <p>${data.name} 様、以下の予約をキャンセルいたしました。</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">日付</td><td>${data.date}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">時間</td><td>${data.time}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">予約番号</td><td>${data.reservationNumber}</td></tr>
      </table>
      <p style="font-size:12px;color:#999;">またのご予約をお待ちしております。</p>
    </div>`,
  })
}

export async function sendAdminNotification(data: {
  name: string; date: string; time: string; slotType: number; reservationNumber: string; email?: string
}) {
  const admin = ADMIN()
  if (!admin || !process.env.RESEND_API_KEY) return
  const slotLabel = data.slotType === 2 ? '2杯枠' : '4杯枠'
  await getResend().emails.send({
    from: FROM(), to: admin,
    subject: `【新規予約】${data.date} ${data.time} ${data.name}様`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#0F6E56;">新規予約が入りました</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">お名前</td><td style="font-weight:bold;">${data.name}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">日付</td><td>${data.date}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">時間</td><td>${data.time}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">枠</td><td>${slotLabel}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;">メール</td><td>${data.email || '未入力'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">予約番号</td><td style="color:#1D9E75;font-weight:bold;">${data.reservationNumber}</td></tr>
      </table>
    </div>`,
  })
}
