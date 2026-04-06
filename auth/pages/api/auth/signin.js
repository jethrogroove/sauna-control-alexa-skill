import { signInUser } from '../../../lib/supabase';

/**
 * POST /api/auth/signin
 * Signs in a user with email and password
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Email and password are required' });
    }

    const { user, session, error } = await signInUser(email, password);

    if (error) {
      return res.status(401).json({ error: error });
    }

    return res.status(200).json({
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
