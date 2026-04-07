import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service role client — used for ALL server-side operations.
 * This bypasses RLS and has full access, so only use in API routes.
 */
let _supabaseAdmin = null;

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

/**
 * Sign up a new user with email and password.
 * Uses the admin client to create users server-side.
 */
export async function signUpUser(email, password) {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for this use case
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('signUpUser error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign in a user with email and password.
 * Uses the anon client for standard auth flow.
 */
export async function signInUser(email, password) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    // Create a fresh client per request to avoid session state issues
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('signInUser error:', error);
    return { user: null, session: null, error: error.message };
  }
}

/**
 * Get user by ID using service role (server-side).
 */
export async function getUserById(userId) {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(userId);

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}
