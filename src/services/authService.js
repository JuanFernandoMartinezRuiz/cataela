import { ensureSupabaseConfigured, supabase } from '../lib/supabaseClient'

export async function signInAdmin({ email, password }) {
  ensureSupabaseConfigured()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOutAdmin() {
  ensureSupabaseConfigured()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function getCurrentSession() {
  if (!supabase) {
    return null
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}
