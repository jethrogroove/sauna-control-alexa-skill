# File Index and Architecture Guide

Complete reference for all files in the Alexa Sauna Control OAuth auth server.

## Project Root Files

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies, scripts, project metadata |
| `next.config.js` | Next.js configuration (pages router, strict mode) |
| `vercel.json` | Vercel deployment config and environment mappings |
| `.env.example` | Template for environment variables |
| `.gitignore` | Git ignore rules for node_modules, .env, etc. |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Complete technical documentation (60+ KB) |
| `QUICKSTART.md` | 15-minute setup guide for first-time users |
| `SETUP_SUMMARY.txt` | Quick reference of all features and setup |
| `TESTING.md` | Comprehensive testing guide with 14 test cases |
| `LAMBDA_EXAMPLE.md` | Alexa Lambda integration examples with code |
| `FILE_INDEX.md` | This file - architecture and file reference |

### Database Files

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | SQL schema for 3 tables, RLS policies, indexes |

## Library Files (`/lib`)

Core business logic and utility functions.

### `lib/supabase.js` (200 lines)

Supabase client setup and helper functions.

**Exports:**
- `supabaseClient` - Public/anon Supabase client
- `supabaseAdmin` - Service role Supabase client
- `signUpUser(email, password)` - Register new user
- `signInUser(email, password)` - Authenticate user
- `getUserById(userId)` - Server-side user lookup
- `verifyToken(token)` - Verify user session token

**Usage:** Authentication and user management operations

### `lib/crypto.js` (150 lines)

AES-256-GCM encryption for sauna credentials.

**Exports:**
- `encryptCredential(plaintext)` - Encrypt single credential
- `decryptCredential(encrypted, iv, authTag)` - Decrypt credential
- `encryptSaunaCredentials(credentials)` - Encrypt email + password
- `decryptSaunaCredentials(record)` - Decrypt from DB record

**Usage:** Protect sensitive sauna provider credentials at rest

**Security:**
- Algorithm: AES-256-GCM (NIST approved)
- Key: 32-byte from ENCRYPTION_KEY env var
- IV: 128-bit random per encryption
- Auth Tag: Prevents tampering

### `lib/tokens.js` (220 lines)

OAuth 2.0 token generation and validation.

**Exports:**
- `createAuthorizationCode(userId, clientId, redirectUri)` - Auth code (5 min)
- `verifyAuthorizationCode(code, clientId, redirectUri)` - Validate + consume
- `createAccessToken(userId, expiresInSeconds)` - JWT token (1 hour)
- `verifyAccessToken(token)` - Validate JWT
- `createRefreshToken(userId, clientId, expiresInSeconds)` - Opaque token (30 days)
- `verifyRefreshToken(token, clientId)` - Validate + use
- `revokeRefreshToken(token)` - Revoke token

**Usage:** OAuth token lifecycle management

**Token Types:**
- **Auth Codes**: Single-use, 5 min expiry, stored in DB
- **Access Tokens**: JWT (HS256), 1 hour expiry, validated offline
- **Refresh Tokens**: Opaque, 30 day expiry, stored in DB, revocable

## Pages and Routes (`/pages`)

### `pages/authorize.js` (600+ lines)

React OAuth authorization page with UI.

**Features:**
- Login/signup form (email + password)
- Sauna credentials form (provider + email + password)
- Two-step flow (auth -> credentials)
- Error/success messages
- Responsive CSS styling (no external frameworks)
- Session-based state (sessionStorage)

**Query Parameters:**
- `client_id` - Alexa client ID
- `redirect_uri` - Where to redirect after auth
- `response_type` - Should be "code" (OAuth 2.0)
- `state` - Opaque state for CSRF protection

**Flow:**
1. User lands on page
2. Shows login/signup form
3. POST to `/api/auth/signin` or `/api/auth/signup`
4. Stores userId in sessionStorage
5. Shows sauna credentials form
6. POST to `/api/oauth/authorize`
7. Receives authCode
8. Redirects to redirect_uri with code + state

### `pages/api/auth/signin.js` (40 lines)

User login endpoint.

**Route:** `POST /api/auth/signin`

**Request:**
```json
{ "email": "user@example.com", "password": "password" }
```

**Response:**
```json
{ "userId": "uuid", "email": "user@example.com" }
```

**Errors:**
- 400: Missing email or password
- 401: Invalid credentials
- 500: Server error

**Uses:** `lib/supabase.js` signInUser()

### `pages/api/auth/signup.js` (50 lines)

User registration endpoint.

**Route:** `POST /api/auth/signup`

**Request:**
```json
{ "email": "user@example.com", "password": "password" }
```

**Response:**
```json
{ "userId": "uuid", "email": "user@example.com" }
```

**Validation:**
- Email format check
- Password >= 8 characters
- Email not already registered

**Errors:**
- 400: Missing fields or validation failed
- 409: Email already registered
- 500: Server error

**Uses:** `lib/supabase.js` signUpUser()

### `pages/api/oauth/authorize.js` (100 lines)

Store sauna credentials and generate auth code.

**Route:** `POST /api/oauth/authorize`

**Request:**
```json
{
  "userId": "uuid",
  "clientId": "alexa-client-id",
  "redirectUri": "https://alexa-redirect-uri",
  "provider": "Huum",
  "saunaEmail": "sauna@example.com",
  "saunaPassword": "saunapass"
}
```

**Response:**
```json
{ "authCode": "hex-string" }
```

**Process:**
1. Validate all required parameters
2. Validate provider is supported
3. Encrypt sauna credentials with AES-256-GCM
4. Store or update in database
5. Generate 5-minute expiry auth code
6. Return authCode to frontend

**Errors:**
- 400: Missing/invalid parameters
- 500: Encryption or database errors

**Uses:** `lib/crypto.js`, `lib/tokens.js`, `lib/supabase.js`

### `pages/api/oauth/token.js` (80 lines)

OAuth 2.0 token endpoint (RFC 6749 compliant).

**Route:** `POST /api/oauth/token`

**Two Grant Types:**

#### Authorization Code Grant
**Request:**
```json
{
  "grant_type": "authorization_code",
  "code": "auth-code-from-authorize-page",
  "redirect_uri": "https://alexa-redirect-uri",
  "client_id": "alexa-client-id",
  "client_secret": "alexa-client-secret"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "opaque-refresh-token"
}
```

#### Refresh Token Grant
**Request:**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "opaque-token",
  "client_id": "alexa-client-id",
  "client_secret": "alexa-client-secret"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Process:**
1. Validate client_id and client_secret
2. If authorization_code: verify and consume code, create tokens
3. If refresh_token: verify and use refresh token, create new access token
4. Return tokens with metadata

**Errors:**
- 400: Missing parameters or unsupported grant_type
- 401: Invalid credentials, code, or token
- 500: Server error

**Uses:** `lib/tokens.js`

### `pages/api/credentials.js` (70 lines)

Protected endpoint to retrieve user's sauna credentials.

**Route:** `GET /api/credentials?provider=Huum`

**Authentication:** Bearer token in Authorization header

**Request:**
```
GET /api/credentials
Authorization: Bearer <jwt-access-token>
```

**Response:**
```json
{
  "provider": "Huum",
  "email": "sauna@example.com",
  "password": "saunapass123"
}
```

**Process:**
1. Extract Bearer token from Authorization header
2. Verify JWT token signature and expiry
3. Lookup user's sauna credentials
4. Decrypt credentials with AES-256-GCM
5. Return plaintext credentials

**Errors:**
- 401: Missing or invalid authorization header
- 401: Invalid or expired token
- 404: No credentials found
- 500: Decryption error

**Uses:** `lib/tokens.js`, `lib/supabase.js`, `lib/crypto.js`

**Security Note:** Returns decrypted credentials only to authenticated requests. Used by Lambda function to get credentials for API calls to sauna provider.

## Database Schema (`supabase-schema.sql`)

Three main tables with RLS policies and indexes.

### `sauna_credentials` Table

Stores encrypted sauna provider credentials.

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `provider` (VARCHAR 50) - Provider name (e.g., "Huum")
- `encrypted_email` (TEXT) - AES-256-GCM encrypted
- `iv_email` (VARCHAR 32) - Hex-encoded IV
- `auth_tag_email` (VARCHAR 32) - Hex-encoded auth tag
- `encrypted_password` (TEXT) - AES-256-GCM encrypted
- `iv_password` (VARCHAR 32) - Hex-encoded IV
- `auth_tag_password` (VARCHAR 32) - Hex-encoded auth tag
- `created_at` (TIMESTAMP) - Record creation
- `updated_at` (TIMESTAMP) - Last update

**Indexes:**
- Primary key on id
- Index on user_id
- Unique index on (user_id, provider)

**RLS Policies:**
- Users can SELECT/INSERT/UPDATE/DELETE their own records

### `oauth_codes` Table

Stores authorization codes for one-time use.

**Columns:**
- `id` (UUID) - Primary key
- `code` (VARCHAR 64) - Authorization code
- `user_id` (UUID) - Foreign key to auth.users
- `client_id` (VARCHAR 255) - Alexa client ID
- `redirect_uri` (TEXT) - Redirect URI
- `expires_at` (TIMESTAMP) - Expiry time (5 minutes)
- `used` (BOOLEAN) - Whether code was consumed
- `created_at` (TIMESTAMP) - Creation time

**Indexes:**
- Primary key on id
- Unique index on code
- Index on user_id
- Index on expires_at (for cleanup)

**RLS Policies:**
- Service role only (backend access)

### `oauth_refresh_tokens` Table

Stores long-lived refresh tokens.

**Columns:**
- `id` (UUID) - Primary key
- `token` (VARCHAR 64) - Refresh token
- `user_id` (UUID) - Foreign key to auth.users
- `client_id` (VARCHAR 255) - Alexa client ID
- `expires_at` (TIMESTAMP) - Expiry time (30 days)
- `revoked` (BOOLEAN) - Whether revoked
- `created_at` (TIMESTAMP) - Creation time

**Indexes:**
- Primary key on id
- Unique index on token
- Index on user_id
- Index on expires_at

**RLS Policies:**
- Service role only (backend access)

## Architecture Diagram

```
                              User Browser
                                  |
                                  v
                      pages/authorize.js
                      (React Login UI)
                                  |
                    ______________|______________
                   |              |              |
                   v              v              v
            /api/auth/   /api/oauth/    /api/credentials
            signin       authorize           (GET)
            signup                    (Bearer token required)
            (POST)       (POST)
                   |              |              |
                   |______________|______________|
                        |
                        v
            lib/supabase.js (Supabase Auth)
            lib/tokens.js (JWT + OAuth)
            lib/crypto.js (AES-256-GCM)
                        |
                        v
                   Supabase Database
            (sauna_credentials, oauth_codes,
             oauth_refresh_tokens)
```

## Data Flow

### User Registration & Account Linking

```
1. User visits /authorize?client_id=...&redirect_uri=...
2. Frontend: Display login/signup form
3. User enters email + password
4. Frontend: POST /api/auth/signup
5. Backend: Create user in Supabase Auth
6. Backend: Return userId
7. Frontend: Store userId in sessionStorage
8. Frontend: Display sauna credentials form
9. User enters sauna provider + email + password
10. Frontend: POST /api/oauth/authorize with all data
11. Backend: Encrypt sauna credentials
12. Backend: Store encrypted credentials
13. Backend: Generate 5-minute auth code
14. Backend: Return authCode
15. Frontend: Redirect to redirect_uri?code=authCode&state=...
16. Alexa receives authorization code
```

### Token Exchange

```
1. Alexa receives auth code
2. Alexa: POST /api/oauth/token with code + client credentials
3. Backend: Validate code (check expiry, not used, client_id match)
4. Backend: Consume code (mark as used)
5. Backend: Create JWT access token (1 hour)
6. Backend: Create refresh token (30 days)
7. Backend: Store refresh token in database
8. Backend: Return access_token + refresh_token
9. Alexa stores tokens securely
```

### Credentials Retrieval

```
1. Lambda function: GET /api/credentials with Bearer token
2. Backend: Verify JWT signature and expiry
3. Backend: Extract user_id from JWT
4. Backend: Lookup sauna_credentials by user_id
5. Backend: Decrypt credentials with AES-256-GCM
6. Backend: Return plaintext credentials
7. Lambda: Use credentials to call sauna provider API
```

## Environment Variables Reference

| Variable | Type | Used In | Purpose |
|----------|------|---------|---------|
| `SUPABASE_URL` | URL | lib/supabase.js | Supabase project URL |
| `SUPABASE_ANON_KEY` | String | lib/supabase.js | Anon/public key for client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | lib/supabase.js | Service role key for backend |
| `ENCRYPTION_KEY` | Base64 | lib/crypto.js | 32-byte key for AES-256-GCM |
| `ALEXA_CLIENT_ID` | String | pages/api/oauth/token.js | OAuth client ID validation |
| `ALEXA_CLIENT_SECRET` | Secret | pages/api/oauth/token.js | OAuth client secret validation |
| `JWT_SECRET` | String | lib/tokens.js | HS256 signing key for JWTs |

## File Dependency Graph

```
pages/authorize.js
├── (calls) /api/auth/signin.js
│   └── (uses) lib/supabase.js
├── (calls) /api/auth/signup.js
│   └── (uses) lib/supabase.js
└── (calls) /api/oauth/authorize.js
    ├── (uses) lib/supabase.js
    ├── (uses) lib/crypto.js
    └── (uses) lib/tokens.js

pages/api/oauth/token.js
├── (uses) lib/tokens.js
│   └── (uses) lib/supabase.js
└── env: ALEXA_CLIENT_ID, ALEXA_CLIENT_SECRET, JWT_SECRET

pages/api/credentials.js
├── (uses) lib/tokens.js (verifyAccessToken)
├── (uses) lib/supabase.js (database queries)
└── (uses) lib/crypto.js (decryptSaunaCredentials)

lib/supabase.js
├── (imports) @supabase/supabase-js
└── env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

lib/crypto.js
├── (imports) crypto (Node.js built-in)
└── env: ENCRYPTION_KEY

lib/tokens.js
├── (imports) jose (JWT library)
├── (uses) lib/supabase.js
├── (imports) crypto (Node.js built-in)
└── env: JWT_SECRET

supabase-schema.sql
└── Creates: sauna_credentials, oauth_codes, oauth_refresh_tokens tables
```

## Performance Considerations

| Component | Optimization |
|-----------|--------------|
| Database Queries | Indexed on frequently queried columns |
| JWT Verification | No DB lookup needed (signature verified) |
| Encryption | Single pass for each credential (email + password) |
| Auth Codes | Unique index prevents duplicates |
| RLS Policies | Prevents unauthorized data access |

## Security Layers

| Layer | Implementation |
|-------|-----------------|
| Transport | HTTPS (forced in production) |
| Authentication | Email/password via Supabase Auth |
| Authorization | JWT with expiry validation |
| Data at Rest | AES-256-GCM encryption |
| CSRF Protection | State parameter in OAuth flow |
| SQL Injection | Parameterized queries via Supabase SDK |
| Database Access | Row-Level Security (RLS) policies |
| Token Revocation | Refresh tokens marked as revoked in DB |

## Common Modifications

### Adding New Sauna Provider

1. Update `pages/authorize.js` select options
2. Add to validation in `pages/api/oauth/authorize.js`
3. Update documentation with new provider

### Changing Token Expiry

Edit `lib/tokens.js`:
- `createAccessToken()` - default 3600 (1 hour)
- `createRefreshToken()` - default 2592000 (30 days)
- `createAuthorizationCode()` - default 300 (5 minutes)

### Adding Email Verification

1. Configure in Supabase Auth settings
2. Add post-signup email flow in `pages/api/auth/signup.js`

### Adding Rate Limiting

1. Use Vercel Edge Functions or middleware
2. Implement in `/api/` routes
3. Return 429 status when limit exceeded

## Testing Files Reference

See `TESTING.md` for 14 comprehensive test cases covering:
- User signup and signin
- OAuth authorization flow
- Token exchange and refresh
- Error handling
- Token expiry
- Database verification
- Security validation
