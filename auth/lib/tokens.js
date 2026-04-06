import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from './supabase.js';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');

/**
 * Generate a random authorization code
 * @returns {string} Random 32-byte hex string
 */
function generateAuthCode() {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a random refresh token
 * @returns {string} Random 32-byte hex string
 */
function generateRefreshToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Create and store an authorization code
 * @param {string} userId - Supabase user ID
 * @param {string} clientId - Alexa client ID
 * @param {string} redirectUri - OAuth redirect URI
 * @returns {Promise<string>} Authorization code
 */
export async function createAuthorizationCode(userId, clientId, redirectUri) {
  const code = generateAuthCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const { error } = await supabaseAdmin
    .from('oauth_codes')
    .insert({
      code,
      user_id: userId,
      client_id: clientId,
      redirect_uri: redirectUri,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

  if (error) {
    throw new Error(`Failed to create authorization code: ${error.message}`);
  }

  return code;
}

/**
 * Verify and consume an authorization code
 * @param {string} code - Authorization code
 * @param {string} clientId - Alexa client ID
 * @param {string} redirectUri - OAuth redirect URI
 * @returns {Promise<string>} User ID if valid, null otherwise
 */
export async function verifyAuthorizationCode(code, clientId, redirectUri) {
  const { data, error } = await supabaseAdmin
    .from('oauth_codes')
    .select('*')
    .eq('code', code)
    .eq('client_id', clientId)
    .eq('redirect_uri', redirectUri)
    .eq('used', false)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if code has expired
  if (new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Mark code as used
  await supabaseAdmin
    .from('oauth_codes')
    .update({ used: true })
    .eq('code', code);

  return data.user_id;
}

/**
 * Create a JWT access token
 * @param {string} userId - Supabase user ID
 * @param {number} expiresInSeconds - Token expiry (default 3600 = 1 hour)
 * @returns {Promise<string>} JWT token
 */
export async function createAccessToken(userId, expiresInSeconds = 3600) {
  try {
    const token = await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${expiresInSeconds}s`)
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    throw new Error(`Failed to create access token: ${error.message}`);
  }
}

/**
 * Verify and decode a JWT access token
 * @param {string} token - JWT token
 * @returns {Promise<{userId: string} | null>} User ID if valid, null otherwise
 */
export async function verifyAccessToken(token) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return { userId: verified.payload.sub };
  } catch (error) {
    return null;
  }
}

/**
 * Create and store a refresh token
 * @param {string} userId - Supabase user ID
 * @param {string} clientId - Alexa client ID
 * @param {number} expiresInSeconds - Token expiry (default 2592000 = 30 days)
 * @returns {Promise<string>} Refresh token
 */
export async function createRefreshToken(
  userId,
  clientId,
  expiresInSeconds = 2592000
) {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const { error } = await supabaseAdmin
    .from('oauth_refresh_tokens')
    .insert({
      token,
      user_id: userId,
      client_id: clientId,
      expires_at: expiresAt.toISOString(),
      revoked: false,
    });

  if (error) {
    throw new Error(`Failed to create refresh token: ${error.message}`);
  }

  return token;
}

/**
 * Verify and use a refresh token to get new access token
 * @param {string} refreshToken - Refresh token
 * @param {string} clientId - Alexa client ID
 * @returns {Promise<{userId: string, accessToken: string} | null>}
 */
export async function verifyRefreshToken(refreshToken, clientId) {
  const { data, error } = await supabaseAdmin
    .from('oauth_refresh_tokens')
    .select('*')
    .eq('token', refreshToken)
    .eq('client_id', clientId)
    .eq('revoked', false)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if token has expired
  if (new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Create new access token
  const accessToken = await createAccessToken(data.user_id);

  return {
    userId: data.user_id,
    accessToken,
  };
}

/**
 * Revoke a refresh token
 * @param {string} refreshToken - Refresh token to revoke
 * @returns {Promise<boolean>} Success status
 */
export async function revokeRefreshToken(refreshToken) {
  const { error } = await supabaseAdmin
    .from('oauth_refresh_tokens')
    .update({ revoked: true })
    .eq('token', refreshToken);

  return !error;
}
