import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email via Supabase Auth
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const siteUrl =
      process.env.AUTH_SERVER_URL || 'https://sauna-control-auth.vercel.app';

    // Use anon client — resetPasswordForEmail sends the email automatically
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      console.error('Reset email error:', error);
    }

    // Always return success to prevent email enumeration
    return res.status(200).json({
      message:
        'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(200).json({
      message:
        'If an account exists with that email, a reset link has been sent.',
    });
  }
}
