import { signUpUser } from '../../../lib/supabase';

/**
 * POST /api/auth/signup
 * Signs up a new user with email and password
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

    // Validate password strength
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters' });
    }

    const { user, error } = await signUpUser(email, password);

    if (error) {
      // Check if user already exists
      if (error.includes('already registered')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: error });
    }

    return res.status(201).json({
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
