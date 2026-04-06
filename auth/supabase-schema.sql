-- Create sauna_credentials table
CREATE TABLE sauna_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  -- Encrypted email for the sauna provider
  encrypted_email TEXT NOT NULL,
  iv_email VARCHAR(32) NOT NULL,
  auth_tag_email VARCHAR(32) NOT NULL,
  -- Encrypted password for the sauna provider
  encrypted_password TEXT NOT NULL,
  iv_password VARCHAR(32) NOT NULL,
  auth_tag_password VARCHAR(32) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create oauth_codes table
CREATE TABLE oauth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id VARCHAR(255) NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create oauth_refresh_tokens table
CREATE TABLE oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE sauna_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own sauna credentials
CREATE POLICY "Users can view their own sauna_credentials"
  ON sauna_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sauna_credentials"
  ON sauna_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sauna_credentials"
  ON sauna_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sauna_credentials"
  ON sauna_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: OAuth codes are service-role only (backend only)
CREATE POLICY "Service role can manage oauth_codes"
  ON oauth_codes
  FOR ALL
  USING (false);

-- RLS Policy: OAuth refresh tokens are service-role only (backend only)
CREATE POLICY "Service role can manage oauth_refresh_tokens"
  ON oauth_refresh_tokens
  FOR ALL
  USING (false);

-- Create indexes for performance
CREATE INDEX idx_sauna_credentials_user_id ON sauna_credentials(user_id);
CREATE INDEX idx_sauna_credentials_user_provider ON sauna_credentials(user_id, provider);
CREATE INDEX idx_oauth_codes_code ON oauth_codes(code);
CREATE INDEX idx_oauth_codes_user_id ON oauth_codes(user_id);
CREATE INDEX idx_oauth_codes_expires_at ON oauth_codes(expires_at);
CREATE INDEX idx_oauth_refresh_tokens_token ON oauth_refresh_tokens(token);
CREATE INDEX idx_oauth_refresh_tokens_user_id ON oauth_refresh_tokens(user_id);
CREATE INDEX idx_oauth_refresh_tokens_expires_at ON oauth_refresh_tokens(expires_at);
