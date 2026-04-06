# Testing Guide

Comprehensive testing guide for the OAuth auth server.

## Local Testing Setup

### 1. Start Development Server

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`

### 2. Test Authorization Flow

Open in browser:
```
http://localhost:3000/authorize?client_id=test&redirect_uri=http://localhost:3000&response_type=code&state=test-state
```

You should see the login/signup form.

## Test Cases

### Test 1: User Signup

1. Visit authorization URL
2. Click "Don't have an account? Sign up"
3. Enter:
   - Email: `testuser@example.com`
   - Password: `SecurePassword123`
4. Click "Create Account"
5. Should see success message
6. Form advances to sauna credentials

### Test 2: User Signin

1. Create account first (Test 1)
2. Refresh page
3. Log in with:
   - Email: `testuser@example.com`
   - Password: `SecurePassword123`
4. Should see success message
5. Form advances to sauna credentials

### Test 3: Sauna Credentials Entry

1. Complete signup (Test 1)
2. Enter sauna credentials:
   - Provider: Huum
   - Email: `sauna@example.com`
   - Password: `saunapass123`
3. Click "Link Account"
4. Should redirect to:
   ```
   http://localhost:3000?code=<auth-code>&state=test-state
   ```

### Test 4: Invalid Credentials

1. Visit authorization URL
2. Try signin with invalid password
3. Should see error: "Invalid login credentials"
4. Try signup with existing email (after Test 1)
5. Should see error: "Email already registered"
6. Try signup with short password
7. Should see error: "Password must be at least 8 characters"

### Test 5: OAuth Token Exchange

Exchange authorization code for tokens using curl:

```bash
# From URL after Test 3, extract the auth code
AUTH_CODE="<code-from-redirect>"

curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "'$AUTH_CODE'",
    "redirect_uri": "http://localhost:3000",
    "client_id": "test",
    "client_secret": "test-secret"
  }'
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "abc123..."
}
```

### Test 6: Get Credentials with Access Token

```bash
# From Test 5, extract the access token
ACCESS_TOKEN="<access-token-from-token-response>"

curl -X GET http://localhost:3000/api/credentials \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Expected response:
```json
{
  "provider": "Huum",
  "email": "sauna@example.com",
  "password": "saunapass123"
}
```

### Test 7: Invalid Access Token

```bash
curl -X GET http://localhost:3000/api/credentials \
  -H "Authorization: Bearer invalid-token"
```

Expected: `401` error with message "Invalid or expired access token"

### Test 8: Refresh Token

```bash
# From Test 5, extract the refresh token
REFRESH_TOKEN="<refresh-token-from-token-response>"

curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "'$REFRESH_TOKEN'",
    "client_id": "test",
    "client_secret": "test-secret"
  }'
```

Expected: New access token in response

### Test 9: Invalid Refresh Token

```bash
curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "invalid-token",
    "client_id": "test",
    "client_secret": "test-secret"
  }'
```

Expected: `401` error with message "Invalid or expired refresh_token"

### Test 10: Auth Code Expiration

1. Complete authorization flow (Test 3)
2. Wait 5+ minutes
3. Try to exchange auth code with:
```bash
curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "'$OLD_AUTH_CODE'",
    "redirect_uri": "http://localhost:3000",
    "client_id": "test",
    "client_secret": "test-secret"
  }'
```

Expected: `401` error with message "Invalid or expired authorization code"

### Test 11: Auth Code Reuse

1. Complete authorization flow (Test 3) and get auth code
2. Exchange it for tokens (Test 5) - succeeds
3. Try to exchange same auth code again
4. Should fail with "Invalid or expired authorization code"

### Test 12: Invalid Client Credentials

```bash
curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "'$AUTH_CODE'",
    "redirect_uri": "http://localhost:3000",
    "client_id": "wrong-client-id",
    "client_secret": "test-secret"
  }'
```

Expected: `401` error with message "Invalid client_id"

### Test 13: Update Sauna Credentials

1. Complete signup and enter credentials for Huum (Test 1-3)
2. Complete another authorization with same user:
   - Visit authorization URL
   - Sign in with same email
   - Enter different sauna credentials
   - Complete authorization
3. Get new access token and fetch credentials
4. Should return the updated credentials

### Test 14: Multiple Providers (Future)

When additional providers are added:
1. Sign up user
2. Link credentials for Huum
3. Authorize again
4. Link credentials for new provider
5. Verify both providers accessible via `/api/credentials?provider=ProviderName`

## Error Handling Tests

### Missing Fields

```bash
# Missing email
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"password": "test"}'
# Expected: 400 "Email and password are required"

# Missing password
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Expected: 400 "Email and password are required"
```

### Invalid Methods

```bash
# GET instead of POST
curl -X GET http://localhost:3000/api/auth/signin
# Expected: 405 "Method not allowed"

# POST instead of GET
curl -X POST http://localhost:3000/api/credentials
# Expected: 405 "Method not allowed"
```

### Invalid OAuth Parameters

```bash
# Missing client_id
curl -X POST http://localhost:3000/api/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "redirectUri": "http://localhost:3000",
    "provider": "Huum",
    "saunaEmail": "test@example.com",
    "saunaPassword": "pass"
  }'
# Expected: 400 "Missing required parameters"

# Invalid provider
curl -X POST http://localhost:3000/api/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "clientId": "test",
    "redirectUri": "http://localhost:3000",
    "provider": "InvalidProvider",
    "saunaEmail": "test@example.com",
    "saunaPassword": "pass"
  }'
# Expected: 400 "Invalid sauna provider"
```

## Database Tests

### Check Database Records

```bash
# In Supabase SQL Editor
SELECT * FROM oauth_codes WHERE code = '<auth-code>';
SELECT * FROM oauth_refresh_tokens WHERE token = '<refresh-token>';
SELECT * FROM sauna_credentials WHERE user_id = '<user-id>';
```

Verify:
- Auth codes marked as used after token exchange
- Refresh tokens stored with correct expiry
- Credentials encrypted (should not see plaintext email/password)

## Security Tests

### Encryption Verification

1. Store credentials via authorization flow
2. Check database directly in Supabase:
   ```sql
   SELECT encrypted_email, iv_email, auth_tag_email
   FROM sauna_credentials
   LIMIT 1;
   ```
3. Verify values are hex strings (encrypted)
4. Decrypt via API:
   ```bash
   curl http://localhost:3000/api/credentials \
     -H "Authorization: Bearer $ACCESS_TOKEN"
   ```
5. Verify plaintext email is returned

### Token Signature Verification

```bash
# Decode JWT (use https://jwt.io)
# Token format: header.payload.signature
# Verify signature with JWT_SECRET from .env.local
# Payload should contain: { sub: userId, iat, exp }
```

### Authorization Header Tests

```bash
# No Authorization header
curl http://localhost:3000/api/credentials
# Expected: 401 "Missing or invalid authorization header"

# Invalid format
curl -H "Authorization: Bearer123" http://localhost:3000/api/credentials
# Expected: 401 "Missing or invalid authorization header"

# Bearer without token
curl -H "Authorization: Bearer " http://localhost:3000/api/credentials
# Expected: 401 "Invalid or expired access token"
```

## Performance Tests

### Load Testing (Optional)

Using Apache Bench:

```bash
# Signup endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 -p signup.json -T application/json \
  http://localhost:3000/api/auth/signup

# Token endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 -p token.json -T application/json \
  http://localhost:3000/api/oauth/token
```

### Memory/CPU Monitoring

```bash
# Start server with monitoring
node --max-old-space-size=512 ./node_modules/.bin/next dev

# Monitor in another terminal
top -p $(pgrep -f "next dev")
```

## Browser Testing

### Chrome DevTools

1. Open Developer Tools (F12)
2. Go to Network tab
3. Perform authorization flow
4. Verify:
   - Authorization page loads
   - Signin/signup POST request successful (200)
   - Authorize POST request successful (200)
   - Redirect includes auth code in URL

### Console Errors

Monitor for JavaScript errors:
1. Open Console tab
2. Perform authorization flow
3. Verify no red error messages
4. Check for CORS or network issues

### Responsive Design

Resize browser to different sizes:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

Verify UI remains responsive and usable.

## Continuous Integration Testing

### Running Tests Locally

```bash
# If you add Jest tests later
npm test

# Linting
npm run lint
```

### Pre-deployment Checklist

Before deploying to Vercel:
- [ ] All 14 test cases pass
- [ ] No console errors
- [ ] Database records correct
- [ ] Credentials properly encrypted
- [ ] Tokens valid and formatted correctly
- [ ] Error messages clear and helpful
- [ ] UI responsive on mobile/tablet
- [ ] Environment variables configured

## Debugging Tips

### Enable Debug Logging

Add to `.env.local`:
```
DEBUG=*
```

Or add logging to endpoints:
```javascript
console.log('Auth attempt:', { email, timestamp: new Date() });
```

View logs:
```bash
npm run dev 2>&1 | grep -i error
```

### Check Browser Network

1. Open DevTools > Network tab
2. Check Request/Response headers
3. Look for:
   - Content-Type: application/json
   - Authorization: Bearer token
   - Set-Cookie headers (if applicable)

### Database Debugging

```sql
-- Check all user records
SELECT * FROM auth.users;

-- Check sauna credentials for user
SELECT * FROM sauna_credentials WHERE user_id = '<user-id>';

-- Check OAuth codes
SELECT code, user_id, expires_at, used FROM oauth_codes
ORDER BY created_at DESC LIMIT 10;

-- Check refresh tokens
SELECT token, user_id, expires_at, revoked FROM oauth_refresh_tokens
ORDER BY created_at DESC LIMIT 10;
```

## Test Results Template

After running tests, document results:

```
TEST RESULTS - [Date]
======================

Test 1: User Signup ✓
Test 2: User Signin ✓
Test 3: Sauna Credentials ✓
Test 4: Invalid Credentials ✓
Test 5: Token Exchange ✓
Test 6: Get Credentials ✓
Test 7: Invalid Token ✓
Test 8: Refresh Token ✓
Test 9: Invalid Refresh ✓
Test 10: Auth Code Expiration ✓
Test 11: Auth Code Reuse ✓
Test 12: Invalid Client ✓
Test 13: Update Credentials ✓
Test 14: Multiple Providers (N/A)

Error Handling: ✓ All tests pass
Database Tests: ✓ Records correct
Security Tests: ✓ Encryption verified
Performance: ✓ No issues

Notes:
- All endpoints responding correctly
- No console errors
- UI responsive
- Ready for deployment
```
