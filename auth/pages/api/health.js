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

  // Try connecting to Supabase via raw fetch first
  let rawFetchStatus = 'not tested';
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/`;
    const resp = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    });
    rawFetchStatus = `status: ${resp.status}`;
  } catch (err) {
    rawFetchStatus = `exception: ${err.message} | cause: ${JSON.stringify(err.cause)}`;
  }

  // Try connecting via Supabase client
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
    supabaseStatus = `exception: ${err.message} | cause: ${JSON.stringify(err.cause)}`;
  }

  return res.status(200).json({
    envVars: checks,
    rawFetch: rawFetchStatus,
    supabase: supabaseStatus,
    nodeVersion: process.version,
  });
}
