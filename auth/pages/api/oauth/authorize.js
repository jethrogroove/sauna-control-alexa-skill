import { createAuthorizationCode } from '../../../lib/tokens';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { encryptSaunaCredentials } from '../../../lib/crypto';

/**
 * POST /api/oauth/authorize
 * Stores sauna credentials and generates authorization code for OAuth flow
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      clientId,
      redirectUri,
      provider,
      saunaEmail,
      saunaPassword,
    } = req.body;

    if (!userId || !clientId || !redirectUri || !provider) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!saunaEmail || !saunaPassword) {
      return res
        .status(400)
        .json({ error: 'Sauna credentials are required' });
    }

    // Validate provider
    const validProviders = ['Huum'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid sauna provider' });
    }

    // Encrypt sauna credentials
    let encrypted;
    try {
      encrypted = encryptSaunaCredentials({
        email: saunaEmail,
        password: saunaPassword,
      });
    } catch (error) {
      console.error('Encryption error:', error);
      return res.status(500).json({ error: 'Failed to encrypt credentials' });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if user already has credentials for this provider
    const { data: existingCreds } = await supabaseAdmin
      .from('sauna_credentials')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    // Store or update sauna credentials
    if (existingCreds) {
      // Update existing credentials
      const { error: updateError } = await supabaseAdmin
        .from('sauna_credentials')
        .update({
          encrypted_email: encrypted.encryptedEmail,
          iv_email: encrypted.ivEmail,
          auth_tag_email: encrypted.authTagEmail,
          encrypted_password: encrypted.encryptedPassword,
          iv_password: encrypted.ivPassword,
          auth_tag_password: encrypted.authTagPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCreds.id);

      if (updateError) {
        console.error('Update credentials error:', updateError);
        return res.status(500).json({ error: 'Failed to update credentials' });
      }
    } else {
      // Insert new credentials
      const { error: insertError } = await supabaseAdmin
        .from('sauna_credentials')
        .insert({
          user_id: userId,
          provider,
          encrypted_email: encrypted.encryptedEmail,
          iv_email: encrypted.ivEmail,
          auth_tag_email: encrypted.authTagEmail,
          encrypted_password: encrypted.encryptedPassword,
          iv_password: encrypted.ivPassword,
          auth_tag_password: encrypted.authTagPassword,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Insert credentials error:', insertError);
        return res.status(500).json({ error: 'Failed to store credentials' });
      }
    }

    // Generate authorization code
    let authCode;
    try {
      authCode = await createAuthorizationCode(userId, clientId, redirectUri);
    } catch (error) {
      console.error('Auth code error:', error);
      return res.status(500).json({ error: 'Failed to generate auth code' });
    }

    return res.status(200).json({
      authCode,
    });
  } catch (error) {
    console.error('Authorize error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
