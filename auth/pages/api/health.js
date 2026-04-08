/**
 * GET /api/health
 * Debug endpoint to check environment and Supabase connectivity.
 * Remove this in production once everything works.
 */
export default async function handler(req, res) {
  const checks = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    JWT_SECRET: !!process.env.JWT_SECRET,
    ALEXA_CLIENT_ID: !!process.env.ALEXA_CLIENT_ID,
    ALEXA_CLIENT_SECRET: !!process.env.ALEXA_CLIENT_SECRET,
    SUPABASE_URL_VALUE: process.env.SUPABASE_URL || 'NOT SET',
  };

  // Try connecting to Supabase
  let supabaseStatus = 'not tested';
  try {
    const { getSupabaseAdmin } = await import('../../lib/supabase');
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1 });
    if (error) {
      supabaseStatus = `error: ${error.message}`;
    } else {
      supabaseStatus = `connected (${data.users.length} users found)`;
    }
  } catch (err) {
    supabaseStatus = `exception: ${err.message}`;
  }

  return res.status(200).json({
    envVars: checks,
    supabase: supabaseStatus,
    nodeVersion: process.version,
  });
}
