import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { taskId, titulo, descripcion, fechaVencimiento, asignadoAId, creadoPorId } = await req.json()

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const [{ data: { users: allUsers } }] = await Promise.all([
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    const assignee = allUsers?.find((u: any) => u.id === asignadoAId)
    const creator  = allUsers?.find((u: any) => u.id === creadoPorId)

    if (!assignee?.email) {
      return new Response(JSON.stringify({ ok: false, error: 'Assignee email not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: assigneeRow } = await adminClient
      .from('users').select('nombre').eq('id', asignadoAId).maybeSingle()
    const { data: creatorRow } = await adminClient
      .from('users').select('nombre').eq('id', creadoPorId).maybeSingle()

    const assigneeName = assigneeRow?.nombre || assignee.email
    const creatorName  = creatorRow?.nombre  || creator?.email || 'Sistema'
    const siteUrl      = Deno.env.get('SITE_URL') ?? 'https://ggs-gt.com'
    const taskUrl      = `${siteUrl}/tareas?id=${taskId}`
    const logoUrl      = `${siteUrl}/ggs-logo.png`

    const fechaStr = fechaVencimiento
      ? new Date(fechaVencimiento + 'T12:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })
      : null

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 16px 0 !important; }
      .card { border-radius: 0 !important; }
      .body-pad { padding: 24px 20px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f0e8">
  <table width="100%" cellpadding="0" cellspacing="0" class="wrapper" style="background:#f5f0e8;padding:32px 16px">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" class="card" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);width:100%;max-width:560px">
        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:28px 32px 24px;text-align:center">
            <img src="${logoUrl}" alt="GGS Seguros" width="110" style="display:block;margin:0 auto 16px;height:auto" />
            <p style="color:white;font-size:17px;font-weight:700;margin:0;letter-spacing:0.01em">Nueva tarea asignada</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td class="body-pad" style="padding:28px 32px">
            <p style="color:#374151;font-size:15px;margin:0 0 16px">Hola <strong>${assigneeName}</strong>,</p>
            <p style="color:#374151;font-size:14px;margin:0 0 20px">
              <strong>${creatorName}</strong> te asignó la siguiente tarea:
            </p>
            <!-- Task card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px">
              <tr><td style="padding:18px 20px">
                <p style="font-size:16px;font-weight:700;color:#111111;margin:0 0 ${descripcion ? '8px' : '0'}">${titulo}</p>
                ${descripcion ? `<p style="font-size:13px;color:#64748b;margin:0 0 12px;line-height:1.5">${descripcion}</p>` : ''}
                ${fechaStr ? `
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#FDF8EE;border:1px solid rgba(196,169,107,0.4);border-radius:6px;padding:6px 12px">
                      <span style="font-size:12px;color:#7A5A1E;font-weight:600">&#128197; Vence: ${fechaStr}</span>
                    </td>
                  </tr>
                </table>` : ''}
              </td></tr>
            </table>
            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${taskUrl}" class="btn" style="display:inline-block;background:#C4A96B;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;min-width:200px;text-align:center">
                  Ver tarea
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="color:#94a3b8;font-size:11px;margin:0">ggs-gt.com &nbsp;·&nbsp; Este es un mensaje automático</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const textBody = `Hola ${assigneeName},\n\n${creatorName} te asignó una tarea: "${titulo}"${descripcion ? `\n\n${descripcion}` : ''}${fechaStr ? `\n\nFecha de vencimiento: ${fechaStr}` : ''}\n\nVer tarea: ${taskUrl}\n\nGrupo Global en Seguros`

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set — email not sent')
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'RESEND_API_KEY not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const fromAddress = Deno.env.get('EMAIL_FROM') ?? 'GGS Seguros <noreply@ggs-gt.com>'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress,
        to: [assignee.email],
        subject: `Nueva tarea asignada: ${titulo}`,
        html: htmlBody,
        text: textBody,
      }),
    })

    const resBody = await res.json()
    if (!res.ok) {
      console.error('Resend error:', resBody)
      return new Response(JSON.stringify({ ok: false, error: resBody }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
