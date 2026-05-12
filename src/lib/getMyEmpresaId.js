import { supabase } from './supabase'

let _cache = null

/** Returns the empresa_id of the current authenticated user (cached per session). */
export async function getMyEmpresaId() {
  if (_cache) return _cache
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('empresa_id').eq('id', user.id).single()
  _cache = data?.empresa_id ?? null
  return _cache
}

/** Call on logout to clear the cached value. */
export function clearEmpresaIdCache() {
  _cache = null
}
