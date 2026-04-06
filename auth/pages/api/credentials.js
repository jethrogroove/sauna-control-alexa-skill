import { verifyAccessToken } from '../../lib/tokens';
import { supabaseAdmin } from '../../lib/supabase';
import { decryptSaunaCredentials } from '../../lib/crypto';

/**
 * GET /api/credentials
 * Protected endpoint that returns the user's encrypted sauna credentials
 * Requires Bearer token in Authorization header
 * Used by Lambda function to retrieve sauna credentials for API calls
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify JWT token
    const verified = await verifyAccessToken(token);

    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    const userId = verified.userId;

    // Get provider from query parameter (optional, defaults to first found)
    const { provider } = req.query;

    // Retrieve sauna credentials from database
    let query = supabaseAdmin
      .from('sauna_credentials')
      .select('*')
      .eq('user_id', userId);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return res.status(404).json({
        error: 'No sauna credentials found',
      });
    }

    // Decrypt credentials
    let decrypted;
    try {
      decrypted = decryptSaunaCredentials(data);
    } catch (error) {
      console.error('Decryption error:', error);
      return res.status(500).json({ error: 'Failed to decrypt credentials' });
    }

    // Return decrypted credentials
    return res.status(200).json({
      provider: data.provider,
      email: decrypted.email,
      password: decrypted.password,
    });
  } catch (error) {
    console.error('Credentials endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
