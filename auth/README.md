# Alexa Sauna Control - OAuth Auth Server

A production-ready OAuth 2.0 authorization server for Alexa skill account linking, built with Next.js and Supabase.

## Architecture Overview

This auth server implements the **OAuth 2.0 Authorization Code Grant** flow specifically designed for Alexa skill account linking:

1. **Authorization Phase**: User logs in (or signs up) and enters sauna provider credentials
2. **Token Exchange**: Alexa exchanges the authorization code for access/refresh tokens
3. **Credential Retrieval**: Lambda skill uses access token to fetch encrypted sauna credentials via `/api/credentials`

### Key Features

- User authentication via Supabase Auth (email/password)
- Sauna provider credential encryption (AES-256-GCM) at rest
- JWT-based access tokens (1 hour expiry)
- Opaque refresh tokens stored in database (30 day expiry)
- Single-use authorization codes (5 minute expiry)
- Production-ready error handling and validation
- Row-Level Security (RLS) for data isolation
- Clean, responsive UI with no external dependencies

## Project Structure

```
auth/
├── package.json              # Dependencies and scripts
├── vercel.json              # Vercel deployment config
├── .env.example             # Environment variable template
├── supabase-schema.sql      # Database schema
├── lib/
│   ├── supabase.js         # Supabase client helpers
│   ├── crypto.js           # AES-256-GCM encryption
│   └── tokens.js           # OAuth token generation/validation
├── pages/
│   ├── authorize.js        # OAuth authorization page
│   └── api/
│       ├── auth/
│       │   ├── signin.js    # POST /api/auth/signin
│       │   └── signup.js    # POST /api/auth/signup
│       ├── oauth/
│       │   ├── authorize.js # POST /api/oauth/authorize
│       │   └── token.js     # POST /api/oauth/token
│       └── credentials.js   # GET /api/credentials
└── README.md               # This file
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- Supabase account (https://supabase.com)
- Vercel account (https://vercel.com)
- Alexa Developer Console access

### 2. Supabase Setup

#### Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your **Project URL** and keys:
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_ANON_KEY`: Anon/Public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role key (keep secret!)

#### Initialize Database Schema

1. Go to SQL Editor in Supabase dashboard
2. Create a new query and paste contents of `supabase-schema.sql`
3. Run the query to create tables, RLS policies, and indexes

#### Enable Email Authentication

1. Go to Authentication > Providers
2. Make sure Email provider is enabled (should be by default)
3. Optionally configure SMTP for custom emails

### 3. Generate Encryption Key

Generate a 32-byte encryption key for AES-256-GCM:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save this as your `ENCRYPTION_KEY`.

### 4. Environment Configuration

Create a `.env.local` file (Vercel-specific) with:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-32-byte-base64-key
ALEXA_CLIENT_ID=your-alexa-client-id
ALEXA_CLIENT_SECRET=your-alexa-client-secret
JWT_SECRET=your-jwt-secret-at-least-32-chars-long
```

Generate JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5. Generate Alexa OAuth Credentials

1. Go to Alexa Developer Console (https://developer.amazon.com/alexa)
2. Create a new Alexa Skill or open existing one
3. Go to Account Linking section
4. Set up your OAuth credentials:
   - Authorization URL: `https://your-domain.vercel.app/authorize`
   - Access Token URL: `https://your-domain.vercel.app/api/oauth/token`
   - Client ID: Generate a random ID (save as `ALEXA_CLIENT_ID`)
   - Client Secret: Generate a random secret (save as `ALEXA_CLIENT_SECRET`)
   - Scope: Optional (not used in basic flow)

### 6. Deploy to Vercel

#### Option A: CLI Deployment

```bash
npm i -g vercel
vercel login
vercel deploy
```

#### Option B: GitHub Integration

1. Push code to GitHub
2. Go to vercel.com and connect your GitHub repo
3. Set environment variables in Vercel dashboard
4. Vercel auto-deploys on push

#### Set Environment Variables in Vercel

1. Go to Project Settings > Environment Variables
2. Add all variables from `.env.local`
3. Select which environments (Production, Preview, Development)

### 7. Configure Alexa Account Linking

Update your Alexa Skill configuration with actual domain:

- Authorization URL: `https://your-vercel-app.vercel.app/authorize`
- Access Token URL: `https://your-vercel-app.vercel.app/api/oauth/token`

## API Endpoints

### Authorization Page

```
GET /authorize?client_id=X&redirect_uri=Y&response_type=code&state=Z
```

OAuth 2.0 authorization endpoint. Redirects to login/signup form.

### Sign Up

```
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

Returns: `{ userId, email }`

### Sign In

```
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

Returns: `{ userId, email }`

### OAuth Authorize

```
POST /api/oauth/authorize
Content-Type: application/json

{
  "userId": "uuid",
  "clientId": "alexa-client-id",
  "redirectUri": "https://alexa-redirect-uri",
  "provider": "Huum",
  "saunaEmail": "sauna@example.com",
  "saunaPassword": "sauna-password"
}
```

Returns: `{ authCode }`

### OAuth Token

```
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth-code",
  "redirect_uri": "https://alexa-redirect-uri",
  "client_id": "alexa-client-id",
  "client_secret": "alexa-client-secret"
}
```

Or for refresh:

```
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "refresh-token",
  "client_id": "alexa-client-id",
  "client_secret": "alexa-client-secret"
}
```

Returns:

```json
{
  "access_token": "jwt-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token"
}
```

### Get Credentials

```
GET /api/credentials?provider=Huum
Authorization: Bearer {access_token}
```

Returns decrypted sauna credentials:

```json
{
  "provider": "Huum",
  "email": "sauna@example.com",
  "password": "sauna-password"
}
```

## Security Considerations

### Encryption at Rest

- Sauna credentials are encrypted using **AES-256-GCM**
- IV (initialization vector) and auth tag stored separately
- Encryption key never leaves backend

### Token Security

- **Access Tokens**: Short-lived JWTs (1 hour)
  - Signed with HS256 algorithm
  - Contains user ID and expiry claim
  - Can be verified without database lookup

- **Refresh Tokens**: Long-lived, opaque strings (30 days)
  - Stored in database
  - Can be revoked
  - Should be transmitted over HTTPS only

- **Auth Codes**: Single-use, 5-minute expiry
  - Used once then marked as consumed
  - Validated before token issuance

### Transport Security

- All endpoints require HTTPS in production
- Cookies set with Secure, HttpOnly, SameSite flags
- CSRF protection via state parameter in OAuth flow

### Database Security

- Row-Level Security (RLS) enforced on all tables
- Service Role key never exposed to client
- OAuth codes/tokens are server-only (RLS prevents direct access)

## Development

### Local Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`

### Testing OAuth Flow

1. Visit `http://localhost:3000/authorize?client_id=test&redirect_uri=http://localhost:3000&response_type=code&state=test-state`
2. Sign up or log in
3. Enter test sauna credentials
4. You'll be redirected with auth code

### Environment Variables for Local Testing

Create `.env.local`:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-encryption-key
ALEXA_CLIENT_ID=test
ALEXA_CLIENT_SECRET=test-secret
JWT_SECRET=test-jwt-secret-at-least-32-chars
```

## Troubleshooting

### Encryption Key Errors

**Error**: "ENCRYPTION_KEY must be 32 bytes"

**Solution**: Ensure ENCRYPTION_KEY is a base64-encoded 32-byte string:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Database Connection Issues

**Error**: "Unable to reach database"

**Solution**:
1. Verify SUPABASE_URL is correct
2. Check SUPABASE_SERVICE_ROLE_KEY is valid
3. Verify firewall/IP allowlist in Supabase

### Invalid Client Credentials

**Error**: "Invalid client_id or client_secret"

**Solution**:
1. Verify ALEXA_CLIENT_ID and ALEXA_CLIENT_SECRET match Alexa console
2. Check environment variables are set in Vercel

### JWT Verification Failures

**Error**: "Invalid or expired access token"

**Solution**:
1. Ensure JWT_SECRET is consistent across restarts
2. Check token hasn't expired (1 hour default)
3. Verify Bearer token format: `Authorization: Bearer <token>`

## Production Checklist

- [ ] Database backups configured in Supabase
- [ ] SSL/HTTPS enabled (automatic on Vercel)
- [ ] Environment variables secured in Vercel
- [ ] Email verification enabled in Supabase Auth
- [ ] Password reset flow configured
- [ ] Rate limiting on auth endpoints (optional)
- [ ] Monitoring/logging setup
- [ ] OAuth credentials generated with strong secrets
- [ ] Encryption key securely managed (rotate periodically)
- [ ] Database indexes verified for performance

## Lambda Integration Example

When the Alexa Lambda function needs sauna credentials:

```javascript
const response = await fetch('https://your-auth-domain.vercel.app/api/credentials', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { provider, email, password } = await response.json();

// Use credentials to call sauna provider API
const saunaResponse = await fetch(`https://api.${provider.toLowerCase()}.com/status`, {
  auth: {
    user: email,
    pass: password
  }
});
```

## License

Private - Alexa Sauna Control Project

## Support

For issues or questions, contact the development team.
