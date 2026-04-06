import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public/anon client - used for client-side operations
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Service role client - used for server-side operations with elevated privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Sign up a new user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, error}>}
 */
export async function signUpUser(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

/**
 * Sign in a user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, session, error}>}
 */
export async function signInUser(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    return { user: null, session: null, error: error.message };
  }
}

/**
 * Get user by ID using service role (server-side)
 * @param {string} userId
 * @returns {Promise<{user, error}>}
 */
export async function getUserById(userId) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

/**
 * Verify JWT token and get user ID
 * @param {string} token
 * @returns {Promise<{userId, error}>}
 */
export async function verifyToken(token) {
  try {
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data.user) {
      return { userId: null, error: error?.message || 'Invalid token' };
    }

    return { userId: data.user.id, error: null };
  } catch (error) {
    return { userId: null, error: error.message };
  }
}
