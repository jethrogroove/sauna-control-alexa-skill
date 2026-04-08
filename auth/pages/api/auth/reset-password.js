import { getSupabaseAdmin } from '../../../lib/supabase';
import { jwtVerify } from 'jose';

/**
 * POST /api/auth/reset-password
 * Updates the user's password using the access token from the reset link.
 * Verifies the token to extract the user ID, then uses the admin API
 * to update the password directly.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, newPassword } = req.body;

    if (!accessToken || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Access token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters' });
    }

    // First, verify the token is valid by getting the user from Supabase
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: getUserError } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (getUserError || !userData?.user) {
      console.error('Token verification error:', getUserError);
      return res.status(400).json({
        error: 'Failed to update password. The reset link may have expired.',
      });
    }

    // Use admin API to update the password — this bypasses session requirements
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
        password: newPassword,
      });

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(400).json({
        error: 'Failed to update password. Please try again.',
      });
    }

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
