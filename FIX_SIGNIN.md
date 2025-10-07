# Fix Sign-In Issue

## Problem

The sign-in is failing because the Supabase anon key in your `.env` file is invalid or expired.

## Quick Fix (2 minutes)

### Step 1: Get Your Real Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project (the URL shows it should be: `0ec90b57d6e95fcbda19832f`)
3. Go to **Settings** → **API**
4. Copy these two values:
   - **Project URL** (should be: `https://0ec90b57d6e95fcbda19832f.supabase.co`)
   - **anon public** key (this is the key you need)

### Step 2: Update Your .env File

Open `.env` in the root of your project and update it:

```bash
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=your_real_anon_key_here
VITE_API_URL=http://localhost:6853
```

**Important:** Replace `your_real_anon_key_here` with the actual anon public key from your Supabase dashboard.

### Step 3: Restart Your Dev Server

The dev server needs to restart to pick up the new environment variables:

1. Stop the current dev server (Ctrl+C if running manually)
2. Restart it: `npm run dev`
3. The server will automatically restart and load the new credentials

### Step 4: Update Backend .env (if needed)

Also update `backend/.env` with the Supabase service role key:

```bash
SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get the service role key from the same page in Supabase dashboard (Settings → API → service_role key).

### Step 5: Test Sign-In

1. Open your app
2. Try signing in again
3. If you don't have an account, try signing up first

## Why This Happened

Looking at your `.env` file history:

1. The Supabase anon key had an expired JWT token
2. The JWT showed: `"exp":1758881574` which corresponds to a specific expiration time
3. This appears to be a test/mock token rather than your real Supabase anon key

The token needs to be the real anon key from your Supabase project dashboard, which doesn't expire.

## Verification

After updating the `.env` file and restarting:

1. Open browser DevTools (F12)
2. Go to Console tab
3. You should NOT see: "Missing Supabase environment variables"
4. Sign-in should work normally

## Additional Notes

### Environment Variables Required

**Frontend (.env):**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon public key
- `VITE_API_URL` - Your backend API URL (default: http://localhost:6853)

**Backend (backend/.env):**
- `SUPABASE_URL` - Same as frontend
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for backend operations
- All Alpaca OAuth credentials (see OAUTH_FIX_GUIDE.md)

### Finding Your Supabase Keys

1. Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy:
   - **Project URL** → VITE_SUPABASE_URL
   - **anon public** → VITE_SUPABASE_ANON_KEY
   - **service_role** → SUPABASE_SERVICE_ROLE_KEY (backend only)

**Warning:** Never commit the service_role key to version control. It has full database access.

## Still Having Issues?

If sign-in still doesn't work:

1. Clear browser cache and cookies
2. Check browser console for errors
3. Verify the Supabase URL is accessible: Open https://0ec90b57d6e95fcbda19832f.supabase.co in browser
4. Check if your Supabase project is active (not paused)
5. Verify auth is enabled in Supabase dashboard (Authentication → Providers)
