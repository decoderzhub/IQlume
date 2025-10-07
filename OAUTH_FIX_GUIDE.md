# Quick Fix Guide: Alpaca OAuth "Refused to Connect" Error

## Problem Identified ✓

Your Alpaca OAuth stopped working after 9/30/2024 because:

**The backend `.env` file exists but is missing the required OAuth credentials.**

The diagnostic shows:
- ✓ `backend/.env` file exists
- ❌ `ALPACA_CLIENT_ID` is not set (using template value)
- ❌ `ALPACA_CLIENT_SECRET` is not set (using template value)
- ✓ `ALPACA_OAUTH_REDIRECT_URI` is correctly set
- ✓ `FRONTEND_URL` is correctly set

## How to Fix (5 minutes)

### Step 1: Get Your Alpaca OAuth Credentials

1. Go to https://app.alpaca.markets/oauth
2. Log in to your Alpaca account
3. You should see your existing OAuth app (or create a new one if missing)
4. Click on your OAuth app to view details
5. Copy these two values:
   - **Client ID** (looks like: `a1b2c3d4e5f6g7h8...`)
   - **Client Secret** (looks like: `1234567890abcdef...`)

### Step 2: Update Your Backend .env File

1. Open the file: `backend/.env`
2. Find these lines:
   ```bash
   ALPACA_CLIENT_ID=your_alpaca_oauth_client_id_here
   ALPACA_CLIENT_SECRET=your_alpaca_oauth_client_secret_here
   ```
3. Replace with your actual values:
   ```bash
   ALPACA_CLIENT_ID=a1b2c3d4e5f6g7h8...
   ALPACA_CLIENT_SECRET=1234567890abcdef...
   ```
4. Save the file

### Step 3: Verify Your Redirect URI in Alpaca

Make sure the redirect URI in your Alpaca OAuth app matches exactly:
```
http://localhost:6853/api/alpaca/oauth/callback
```

If you're deploying to production, you'll need to add the production redirect URI as well:
```
https://your-domain.com/api/alpaca/oauth/callback
```

### Step 4: Restart Your Backend Server

```bash
cd backend
python3 run.py
```

Or if you're using Docker:
```bash
docker-compose restart backend
```

### Step 5: Verify the Fix

Run the diagnostic script:
```bash
cd backend
python3 check_oauth_config.py
```

You should see:
```
✓ All required OAuth configurations are set!
```

### Step 6: Test the Connection

1. Open your app and go to the **Accounts** page
2. Click **"Debug OAuth Config"** button
3. Verify all items show green checkmarks
4. Click **"Connect Brokerage"** and select **Alpaca**
5. The OAuth flow should now work correctly

## What Happened on 9/30?

Based on the investigation, the most likely scenarios are:

1. **Environment file was reset** - During a deployment or update, the backend `.env` file was recreated from the template without the OAuth credentials
2. **Git operation** - A `git reset` or similar operation may have restored the `.env` file to the template state
3. **Manual edit** - The OAuth credentials were accidentally removed or commented out

## Prevention Tips

To prevent this from happening again:

1. **Backup your credentials**: Keep a secure copy of your OAuth credentials
2. **Use a secrets manager**: Consider using AWS Secrets Manager, HashiCorp Vault, or similar
3. **Check after deployments**: Always verify your `.env` files after deployments
4. **Use the diagnostic**: Run `python3 backend/check_oauth_config.py` after any server updates

## Still Having Issues?

If OAuth still doesn't work after following these steps:

1. Check browser console for detailed error messages (look for `[Alpaca OAuth]`)
2. Check backend server logs for errors (look for `[alpaca]`)
3. Use the in-app **OAuth Configuration Debugger** on the Accounts page
4. Verify your Alpaca account is active and approved for the scopes you're requesting
5. Try with a fresh browser session (clear cache/cookies)

## Quick Reference

### Required Environment Variables (backend/.env)
```bash
ALPACA_CLIENT_ID=<from Alpaca dashboard>
ALPACA_CLIENT_SECRET=<from Alpaca dashboard>
ALPACA_OAUTH_REDIRECT_URI=http://localhost:6853/api/alpaca/oauth/callback
FRONTEND_URL=http://localhost:5173
ALPACA_ENV=paper
```

### Alpaca OAuth Dashboard
https://app.alpaca.markets/oauth

### Diagnostic Script
```bash
python3 backend/check_oauth_config.py
```

### Full Documentation
See `ALPACA_OAUTH_SETUP.md` for complete setup instructions.
