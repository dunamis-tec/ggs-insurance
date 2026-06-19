import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://ggs-gt.com'

function inviteEmailHtml(nombre: string, actionLink: string): string {
  const logoUrl = `${SITE_URL}/ggs-logo.png`
  const displayName = nombre || 'nuevo integrante'
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .card { border-radius: 0 !important; }
      .body-pad { padding: 24px 20px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f0e8">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" class="card" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);width:100%;max-width:560px">
        <tr>
          <td style="background:#111111;padding:28px 32px 24px;text-align:center">
            <img src="${logoUrl}" alt="GGS Seguros" width="110" style="display:block;margin:0 auto 16px;height:auto" />
            <p style="color:white;font-size:17px;font-weight:700;margin:0;letter-spacing:0.01em">Invitación al sistema</p>
          </td>
        </tr>
        <tr>
          <td class="body-pad" style="padding:28px 32px">
            <p style="color:#374151;font-size:15px;margin:0 0 16px">Hola <strong>${displayName}</strong>,</p>
            <p style="color:#374151;font-size:14px;margin:0 0 24px;line-height:1.65">
              Fuiste invitado a unirte al sistema de gestión de <strong>GGS Seguros</strong>.
              Hacé clic en el botón de abajo para configurar tu contraseña y activar tu cuenta.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${actionLink}" class="btn" style="display:inline-block;background:#C4A96B;color:white;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;min-width:200px;text-align:center">
                  Configurar contraseña
                </a>
              </td></tr>
            </table>
            <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;text-align:center">
              Este enlace expira en 24 horas. Si no esperabas este correo puedes ignorarlo.
            </p>
          </td>
        </tr>
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
}

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<void> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  const from = Deno.env.get('EMAIL_FROM') ?? 'GGS Seguros <noreply@ggs-gt.com>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(`Resend error: ${JSON.stringify(body)}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, nombre, rol, empresa_id } = await req.json()

    if (!email || !empresa_id) {
      return new Response(JSON.stringify({ error: 'email y empresa_id son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

    // ── Step 1: Generate invite link (creates auth user, no email sent by Supabase) ──
    let authUserId: string | null = null
    let actionLink: string | null = null

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${SITE_URL}/reset-password`,
        data: { nombre, rol, empresa_id },
      },
    })

    if (linkError) {
      if (linkError.message.toLowerCase().includes('already')) {
        // User already exists — send a recovery link with same invite-style email
        const { data: recoveryData, error: recoveryErr } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: `${SITE_URL}/reset-password` },
        })
        if (recoveryErr) return new Response(JSON.stringify({ error: recoveryErr.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
        actionLink = recoveryData?.properties?.action_link ?? null
        const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existing = allUsers?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        authUserId = existing?.id ?? null
      } else {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      authUserId = linkData?.user?.id ?? null
      actionLink = linkData?.properties?.action_link ?? null
    }

    // ── Step 2: Upsert into users table with the correct auth UUID ────────
    if (authUserId) {
      const { data: staleRow } = await adminClient
        .from('users').select('id').eq('email', email).neq('id', authUserId).maybeSingle()
      if (staleRow) await adminClient.from('users').delete().eq('id', staleRow.id)

      const rolValue = rol || 'agente'
      await adminClient.from('users').upsert(
        {
          id: authUserId,
          email,
          nombre: nombre || '',
          rol: rolValue,
          role: rolValue,
          full_name: nombre || email.split('@')[0],
          empresa_id,
        },
        { onConflict: 'id' }
      )
    }

    // ── Step 3: Send branded invite email via Resend ───────────────────────
    if (actionLink) {
      const subject = 'Invitación a GGS Seguros — Configurá tu contraseña'
      const html = inviteEmailHtml(nombre || '', actionLink)
      const text = `Hola ${nombre || ''},\n\nFuiste invitado a unirte al sistema de GGS Seguros.\n\nConfigurá tu contraseña aquí:\n${actionLink}\n\nEste enlace expira en 24 horas.\n\nGrupo Global en Seguros`
      await sendViaResend(email, subject, html, text)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
