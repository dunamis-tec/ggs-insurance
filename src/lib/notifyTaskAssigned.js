import { supabase } from './supabase'

/**
 * Calls the notify-task-assigned Edge Function when a task is assigned
 * to someone other than the creator. Fire-and-forget — never throws.
 */
export async function notifyTaskAssigned({ taskId, titulo, descripcion, fechaVencimiento, asignadoAId, creadoPorId }) {
  if (!asignadoAId || asignadoAId === creadoPorId) return  // no notification for self-assign
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-task-assigned`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ taskId, titulo, descripcion, fechaVencimiento, asignadoAId, creadoPorId }),
      }
    )
  } catch (e) {
    console.warn('notify-task-assigned failed (non-blocking):', e)
  }
}
