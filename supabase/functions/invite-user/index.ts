import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, nombre, rol, empresa_id } = await req.json()

    if (!email || !empresa_id) {
      return new Response(JSON.stringify({ error: 'email y empresa_id son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Admin client — uses SERVICE_ROLE key (never exposed to frontend)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    // ── Step 1: Invite or find the auth user ─────────────────────────────
    let authUserId: string | null = null

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://ggs-insurance.vercel.app'}/reset-password`,
      data: { nombre, rol, empresa_id }
    })

    if (inviteError) {
      if (inviteError.message.includes('already been registered')) {
        // User already exists in auth — look up their real auth UUID
        const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existing = allUsers?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        authUserId = existing?.id ?? null
      } else {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } else {
      // Fresh invite — Supabase returns the new auth user with their UUID
      authUserId = invited?.user?.id ?? null
    }

    // ── Step 2: Upsert into users table with the CORRECT auth UUID ────────
    if (authUserId) {
      // If a stale row exists with this email but a different id, remove it first
      const { data: staleRow } = await adminClient
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', authUserId)
        .maybeSingle()

      if (staleRow) {
        await adminClient.from('users').delete().eq('id', staleRow.id)
      }

      // Upsert with the real auth UUID as the primary key
      await adminClient.from('users').upsert(
        { id: authUserId, email, nombre: nombre || '', rol: rol || 'agente', empresa_id },
        { onConflict: 'id' }
      )
    } else {
      // Fallback (should not happen): upsert by email only
      await adminClient.from('users').upsert(
        { email, nombre: nombre || '', rol: rol || 'agente', empresa_id },
        { onConflict: 'email' }
      )
    }

    return new Response(JSON.stringify({ ok: true, user: invited?.user ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
