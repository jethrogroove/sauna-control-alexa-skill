# Quick Start Guide

Get your Alexa OAuth auth server running in 15 minutes.

## 1. Create Supabase Project (3 minutes)

1. Visit https://supabase.com and sign up
2. Create new project, note down:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Go to SQL Editor, create new query
4. Paste the entire contents of `supabase-schema.sql`
5. Click "Run"

## 2. Generate Secrets (2 minutes)

Open terminal and run:

```bash
# Generate ENCRYPTION_KEY (32-byte key for AES-256-GCM)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate ALEXA_CLIENT_ID (any random ID)
node -e "console.log('ALEXA_CLIENT_ID=' + require('crypto').randomBytes(16).toString('hex'))"

# Generate ALEXA_CLIENT_SECRET (any random secret)
node -e "console.log('ALEXA_CLIENT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy these outputs.

## 3. Setup Environment (2 minutes)

Create `.env.local`:

```bash
SUPABASE_URL=<paste your url>
SUPABASE_ANON_KEY=<paste your anon key>
SUPABASE_SERVICE_ROLE_KEY=<paste your service role key>
ENCRYPTION_KEY=<paste encryption key>
ALEXA_CLIENT_ID=<paste client id>
ALEXA_CLIENT_SECRET=<paste client secret>
JWT_SECRET=<paste jwt secret>
```

## 4. Run Locally (2 minutes)

```bash
npm install
npm run dev
```

Visit: http://localhost:3000/authorize?client_id=test&redirect_uri=http://localhost:3000&response_type=code

Test the flow:
1. Sign up with test@example.com / password123
2. Enter dummy sauna creds
3. Should redirect with auth code

## 5. Deploy to Vercel (5 minutes)

```bash
npm i -g vercel
vercel login
vercel deploy
```

When prompted, set environment variables (copy from `.env.local`).

After deployment:
- Note your Vercel URL (e.g., `https://my-app.vercel.app`)
- Update Alexa Developer Console with this URL

## 6. Configure Alexa Skill

In Alexa Developer Console:

1. Go to your skill > Account Linking
2. Set:
   - **Authorization URL**: `https://your-vercel-url.vercel.app/authorize`
   - **Access Token URL**: `https://your-vercel-url.vercel.app/api/oauth/token`
   - **Client ID**: (from ALEXA_CLIENT_ID env var)
   - **Client Secret**: (from ALEXA_CLIENT_SECRET env var)

## 7. Test Full Flow

In Alexa Developer Console:

1. Go to Test tab
2. Launch your skill
3. Trigger account linking
4. Should redirect to your authorization page
5. Sign in, enter sauna credentials
6. Should complete and return to Alexa

## Troubleshooting

### "Cannot find ENCRYPTION_KEY"
- Add ENCRYPTION_KEY to .env.local
- Restart dev server with `npm run dev`

### Database errors
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check supabase-schema.sql ran without errors
- Try queries in Supabase SQL Editor

### Auth page won't load
- Check browser console for errors
- Verify Supabase credentials in .env.local
- Test with: `http://localhost:3000/authorize?client_id=test&redirect_uri=http://localhost:3000&response_type=code`

### Token endpoint returns 401
- Verify ALEXA_CLIENT_SECRET matches in .env.local
- Check JWT_SECRET is set
- Make sure auth code hasn't expired (5 minutes)

## Next Steps

1. **Customize UI**: Edit `pages/authorize.js` styling
2. **Add providers**: Update `pages/authorize.js` select options and validation
3. **Email verification**: Configure Supabase Auth email settings
4. **Rate limiting**: Add to Vercel middleware
5. **Logging**: Integrate with error tracking (Sentry, etc.)

## Files Reference

| File | Purpose |
|------|---------|
| `package.json` | Dependencies |
| `.env.local` | Environment variables (create from .env.example) |
| `supabase-schema.sql` | Database schema |
| `lib/supabase.js` | Supabase client helpers |
| `lib/crypto.js` | Credential encryption/decryption |
| `lib/tokens.js` | OAuth token management |
| `pages/authorize.js` | Login/signup UI |
| `pages/api/auth/signin.js` | User login endpoint |
| `pages/api/auth/signup.js` | User signup endpoint |
| `pages/api/oauth/authorize.js` | Credential storage + auth code generation |
| `pages/api/oauth/token.js` | OAuth token exchange endpoint |
| `pages/api/credentials.js` | Protected credential retrieval endpoint |

## Security Notes

- Never commit `.env.local` to git
- Rotate `ENCRYPTION_KEY` and `JWT_SECRET` periodically
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Use HTTPS in production (automatic on Vercel)
- Monitor failed login attempts

## Support

See README.md for detailed documentation and advanced configuration.
