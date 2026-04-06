import {
  verifyAuthorizationCode,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from '../../../lib/tokens';

/**
 * POST /api/oauth/token
 * OAuth 2.0 token endpoint
 * Handles:
 * - grant_type=authorization_code: Exchange auth code for tokens
 * - grant_type=refresh_token: Exchange refresh token for new access token
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Invalid request method' });
  }

  try {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      refresh_token,
    } = req.body;

    // Validate client credentials
    if (client_id !== process.env.ALEXA_CLIENT_ID) {
      return res.status(401).json({ error: 'Invalid client_id' });
    }

    if (client_secret !== process.env.ALEXA_CLIENT_SECRET) {
      return res.status(401).json({ error: 'Invalid client_secret' });
    }

    // Handle authorization code exchange
    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'Missing code or redirect_uri' });
      }

      // Verify authorization code
      const userId = await verifyAuthorizationCode(code, client_id, redirect_uri);

      if (!userId) {
        return res.status(401).json({ error: 'Invalid or expired authorization code' });
      }

      // Create new tokens
      const accessToken = await createAccessToken(userId, 3600); // 1 hour
      const newRefreshToken = await createRefreshToken(userId, client_id, 2592000); // 30 days

      return res.status(200).json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: newRefreshToken,
      });
    }

    // Handle refresh token exchange
    if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return res.status(400).json({ error: 'Missing refresh_token' });
      }

      // Verify refresh token
      const result = await verifyRefreshToken(refresh_token, client_id);

      if (!result) {
        return res.status(401).json({ error: 'Invalid or expired refresh_token' });
      }

      return res.status(200).json({
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
      });
    }

    return res.status(400).json({ error: 'Unsupported grant_type' });
  } catch (error) {
    console.error('Token endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
