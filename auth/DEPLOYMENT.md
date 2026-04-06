# Deployment Guide

Production deployment checklist and instructions for Vercel and Supabase.

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (see TESTING.md)
- [ ] No console errors or warnings
- [ ] All environment variables configured
- [ ] .env.local not committed to git
- [ ] Code linted with `npm run lint` (if configured)
- [ ] No hardcoded secrets in code

### Security
- [ ] ENCRYPTION_KEY is 32-byte base64 string
- [ ] JWT_SECRET is at least 32 characters
- [ ] ALEXA_CLIENT_SECRET is strong (32+ chars)
- [ ] SUPABASE_SERVICE_ROLE_KEY is kept secret
- [ ] All .env variables marked as secrets in Vercel
- [ ] Database RLS policies verified

### Database
- [ ] supabase-schema.sql applied successfully
- [ ] All tables created
- [ ] RLS policies enabled on all tables
- [ ] Indexes created for performance
- [ ] Backups configured in Supabase

### Alexa Configuration
- [ ] Client ID and Client Secret generated
- [ ] Authorization URL ready
- [ ] Access Token URL ready
- [ ] Test account created in Alexa Developer Console

## Step 1: Prepare Supabase

### Create Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in details:
   - Organization: Create or select
   - Project Name: `alexa-sauna-auth`
   - Password: Strong password (save securely)
   - Region: Choose closest to users
   - Pricing: Pay-as-you-go (for production)
4. Click "Create new project" (wait 2-3 minutes)

### Get Credentials

Once project created:

1. Go to Project Settings > API
2. Note down:
   - Project URL (SUPABASE_URL)
   - Anon Key (SUPABASE_ANON_KEY)
   - Service Role Key (SUPABASE_SERVICE_ROLE_KEY - keep secret!)

### Initialize Database

1. Go to SQL Editor in Supabase dashboard
2. Click "Create a new query"
3. Copy entire contents of `supabase-schema.sql`
4. Paste into editor
5. Click "Run"
6. Verify success message

### Configure Authentication

1. Go to Authentication > Providers
2. Email provider should be enabled (default)
3. Go to Email Templates
4. Customize confirmation and reset emails (optional)
5. Enable "Confirm email" if desired

### Configure Backups

1. Go to Project Settings > Backups
2. Enable automated backups
3. Set retention period (30 days recommended)

## Step 2: Generate Secrets

Run these commands to generate required secrets:

```bash
# Generate ENCRYPTION_KEY (32-byte base64)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT_SECRET (min 32 chars)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate ALEXA_CLIENT_ID (random hex)
node -e "console.log('ALEXA_CLIENT_ID=' + require('crypto').randomBytes(16).toString('hex'))"

# Generate ALEXA_CLIENT_SECRET (strong secret)
node -e "console.log('ALEXA_CLIENT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Save all outputs securely** (password manager or secure file).

## Step 3: Deploy to Vercel

### Option A: CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd /path/to/auth
vercel deploy

# Follow prompts:
# - Link to existing project or create new
# - Confirm deployment details
# - Set environment variables (see step 4)
```

### Option B: GitHub Integration

1. Push code to GitHub repo
2. Go to https://vercel.com
3. Click "New Project"
4. Select GitHub repo
5. Click "Import"
6. Configure environment variables (see step 4)
7. Click "Deploy"

### Option C: Git Push (If using Vercel GitHub Integration)

```bash
git add .
git commit -m "Deploy auth server"
git push origin main
```

Vercel auto-deploys on push to main branch.

## Step 4: Configure Environment Variables

### In Vercel Dashboard

1. Go to Project Settings > Environment Variables
2. Add all 7 variables:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | From Supabase settings |
| `SUPABASE_ANON_KEY` | From Supabase settings |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase settings |
| `ENCRYPTION_KEY` | Generated earlier |
| `ALEXA_CLIENT_ID` | Generated earlier |
| `ALEXA_CLIENT_SECRET` | Generated earlier |
| `JWT_SECRET` | Generated earlier |

3. For each variable:
   - Select environment: Production, Preview, Development
   - Click "Save"

**Important**: Ensure all are marked as secrets/sensitive.

### Via Vercel CLI

```bash
vercel env add SUPABASE_URL
# Prompts for value, select environments
```

Repeat for all 7 variables.

## Step 5: Configure Alexa Skill

### Get Deployment URL

After Vercel deployment:

1. Go to your Vercel project
2. Note your deployment URL (e.g., `https://my-app.vercel.app`)
3. Copy this URL

### Configure in Alexa Developer Console

1. Go to https://developer.amazon.com/alexa
2. Select your Alexa Skill
3. Go to Build > Account Linking
4. Fill in:

**Authorization URL:**
```
https://your-vercel-url.vercel.app/authorize
```

**Access Token URL:**
```
https://your-vercel-url.vercel.app/api/oauth/token
```

**Client ID:**
```
<your ALEXA_CLIENT_ID from step 2>
```

**Client Secret:**
```
<your ALEXA_CLIENT_SECRET from step 2>
```

**Scope:** (leave empty or add custom scopes if needed)

**Privacy Policy URL:** (add your privacy policy URL)

**Domain List:** (add your domain if required)

5. Click "Save"

## Step 6: Test Deployment

### Test Authorization Flow

1. In Alexa Developer Console, go to Test tab
2. Enable "Alexa Simulator" or use physical device
3. Say: "Alexa, link account with [Skill Name]"
4. Should redirect to your auth page
5. Sign up with test account
6. Enter test sauna credentials
7. Should complete account linking

### Test in Alexa App

1. Open Alexa mobile app
2. Go to More > Skills & Games
3. Find your skill
4. Click "Link" (or "Enable With Alexa")
5. Browser opens to your auth page
6. Complete authorization flow
7. Should return to app with success message

### Test Credential Retrieval

Once linked, test Lambda can get credentials:

```bash
# Get access token from Alexa context
ACCESS_TOKEN="<token-from-alexa>"
AUTH_URL="https://your-vercel-url.vercel.app"

curl -X GET "$AUTH_URL/api/credentials" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Should return: { provider, email, password }
```

## Step 7: Monitor in Production

### Vercel Analytics

1. Go to Vercel Dashboard > Analytics
2. Monitor:
   - Request count
   - Response times
   - Error rates
   - Status codes

### Supabase Monitoring

1. Go to Supabase Dashboard > Database
2. Monitor:
   - Query performance
   - Table sizes
   - Connection count

3. Go to Auth > Users
4. Monitor:
   - New signups
   - Failed logins
   - User count

### Error Tracking

Set up error monitoring (optional):

**With Sentry:**
```bash
npm install @sentry/nextjs
```

Configure in Sentry dashboard and add to code.

**With Vercel Analytics:**
Already integrated, view in Vercel dashboard.

## Scaling Considerations

### Database

**Supabase scales automatically**, but consider:

- Monitor monthly active users
- Upgrade tier if approaching limits
- Enable read replicas for high read volume
- Archive old OAuth codes/tokens

### Serverless Functions

**Vercel auto-scales**, but:

- Monitor cold start times
- Consider upgrading if many concurrent requests
- Use Vercel Crons for cleanup jobs (future)

### Token Cleanup

Add periodic job to clean up expired tokens (future enhancement):

```javascript
// Could be Vercel Cron
export default async function handler(req, res) {
  // Delete expired oauth codes
  await supabaseAdmin
    .from('oauth_codes')
    .delete()
    .lt('expires_at', new Date().toISOString());

  // Delete expired refresh tokens
  await supabaseAdmin
    .from('oauth_refresh_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());

  res.status(200).json({ cleaned: true });
}
```

## Disaster Recovery

### Backup & Restore

**Supabase automatic backups:**
1. Configured in Step 1 > Configure Backups
2. Stored in AWS S3
3. Configurable retention

**Manual backup:**
```bash
# Export data (via Supabase Dashboard > Database)
# Settings > Backups > Download
```

### Secret Rotation

If secrets compromised:

1. Regenerate in Vercel dashboard:
   ```bash
   ALEXA_CLIENT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

2. Update in Vercel environment variables

3. Update in Alexa Developer Console

4. Revoke old refresh tokens (optional):
   ```sql
   UPDATE oauth_refresh_tokens SET revoked = true;
   ```

## Troubleshooting Deployment

### 500 Errors in Production

**Check Vercel logs:**
```bash
vercel logs <function-name>
```

**Common issues:**
- Missing environment variables
- Supabase service key permissions
- Encryption key mismatch

### CORS Errors

**Check Alexa redirect_uri:**
- Must match exactly (https/http, domain, path)
- No trailing slashes

### Database Connection Issues

**In Vercel:**
1. Check environment variables
2. Verify SUPABASE_SERVICE_ROLE_KEY is correct
3. Test with curl:
   ```bash
   curl https://your-vercel-url.vercel.app/api/credentials \
     -H "Authorization: Bearer test"
   ```

### Token Validation Failures

**Check JWT_SECRET:**
- Must match in local and production
- Length >= 32 characters

**Debug with:**
```bash
# Visit local auth page
http://localhost:3000/authorize?client_id=test&redirect_uri=http://localhost:3000&response_type=code
```

## Performance Optimization

### Edge Caching

Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/authorize",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

### Database Query Optimization

Monitor slow queries in Supabase:
1. Dashboard > Database > Query Performance
2. Add indexes as needed

### Bundle Size

Check Next.js bundle:
```bash
npm run build
# Check .next/static/chunks/
```

## Rollback Plan

If deployment has issues:

### Via Vercel CLI

```bash
# See deployment history
vercel list

# Rollback to previous
vercel rollback
```

### Via Vercel Dashboard

1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." menu
4. Select "Promote to Production"

## Post-Deployment Checklist

- [ ] Deployment URL accessible
- [ ] All environment variables set correctly
- [ ] Database tables created and indexed
- [ ] Alexa skill account linking configured
- [ ] Test account creation works
- [ ] Authorization flow complete
- [ ] Tokens generated correctly
- [ ] Credentials encrypted and retrievable
- [ ] Vercel monitoring enabled
- [ ] Supabase backups configured
- [ ] Error tracking configured (optional)
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Team notified of deployment

## Maintenance Schedule

**Daily:**
- Monitor Vercel error logs
- Check Alexa skill analytics

**Weekly:**
- Review user signups
- Monitor database size
- Check failed login trends

**Monthly:**
- Review performance metrics
- Update dependencies (npm update)
- Audit access logs
- Rotate secrets if needed

**Quarterly:**
- Security audit
- Database optimization
- Disaster recovery test
- Update documentation

## Support & Escalation

**Issues Checklist:**

1. Check Vercel logs: `vercel logs`
2. Check Supabase logs: Dashboard > Logs
3. Verify environment variables in Vercel
4. Test locally: `npm run dev`
5. Check Alexa Developer Console logs
6. Review error tracking service

**Contact Resources:**
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Alexa Support: https://developer.amazon.com/contact-us

## Summary

Production deployment involves:

1. Create Supabase project ✓
2. Run database schema ✓
3. Generate secrets ✓
4. Deploy to Vercel ✓
5. Configure environment variables ✓
6. Update Alexa skill ✓
7. Test authorization flow ✓
8. Monitor and maintain ✓

**Estimated time:** 30-45 minutes

**Estimated monthly cost:**
- Supabase: $25-50/mo
- Vercel: $20/mo
- Total: $45-70/mo for small-medium scale
