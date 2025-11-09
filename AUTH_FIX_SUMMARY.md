# Market Data API Authentication Fix

## Problem Identified

Your API authentication tests were failing because you were using **Supabase API keys** (ANON_KEY and SERVICE_ROLE_KEY) instead of **user session tokens**.

### What You Were Using (Incorrect):
```bash
# Attempt 2: SUPABASE_ANON_KEY (role: "anon")
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2c2ptZnllZG9od3R6cHV2aWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjY4NzQsImV4cCI6MjA2ODcwMjg3NH0...

# Attempt 3: SUPABASE_SERVICE_ROLE_KEY (role: "service_role")
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2c2ptZnllZG9od3R6cHV2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEyNjg3NCwiZXhwIjoyMDY4NzAyODc0fQ...
```

### What You Need (Correct):
A **user session token** with:
- role: "authenticated"
- sub: your user ID
- email: your email address

## Fixes Implemented

### 1. Enhanced Authentication Error Messages

**File:** `backend/dependencies.py`

The authentication system now detects when you're using the wrong token type and provides helpful error messages:

```python
# Now detects and rejects ANON keys
if token_role == "anon":
    raise HTTPException(
        status_code=401,
        detail="Invalid token: You're using the Supabase ANON key. Please log in to your app and use your session token instead."
    )

# Now detects and rejects SERVICE_ROLE keys
elif token_role == "service_role":
    raise HTTPException(
        status_code=401,
        detail="Invalid token: You're using the Supabase SERVICE_ROLE key. Please log in to your app and use your session token instead."
    )
```

### 2. Improved JWT Verification

The system now properly verifies JWT tokens with two modes:

#### Full Verification (Recommended for Production)
If you set `SUPABASE_JWT_SECRET` in your `.env`:
- Verifies JWT signature cryptographically
- Checks token expiration
- Validates audience claim
- Most secure option

#### Basic Verification (Current Fallback)
If `SUPABASE_JWT_SECRET` is not set:
- Checks token structure and format
- Validates role is "authenticated"
- Checks token expiration
- Verifies user exists (where possible)
- Works for development/testing

### 3. Updated Test Script

**File:** `test-market-data-api.sh`

Added clearer instructions on how to get a proper user session token.

## How to Test the API Properly

### Step 1: Get Your User Session Token

1. Open your IQlume app in a browser: `http://localhost:5173` (or your deployed URL)
2. **Log in with your user account** (create an account if you don't have one)
3. Open browser console (F12 or Cmd+Option+I)
4. Run this command in the console:
   ```javascript
   (await supabase.auth.getSession()).data.session.access_token
   ```
5. Copy the token (it will be a long JWT starting with `eyJ...`)

### Step 2: Run the Test Script

```bash
./test-market-data-api.sh "eyJhbGci...your-actual-session-token..."
```

### Expected Successful Response:

```json
{
  "data": [
    {
      "timestamp": "2025-11-09T10:00:00Z",
      "open": 150.25,
      "high": 151.50,
      "low": 149.80,
      "close": 151.00,
      "volume": 1234567
    }
  ],
  "symbol": "AAPL",
  "timeframe": "1Day"
}
```

## Optional: Add JWT Secret for Full Security

For production deployments, you should add the JWT secret for full signature verification:

### How to Get Your JWT Secret:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `qvsjmfyedohwtzpuvilr`
3. Navigate to: **Settings → API**
4. Find the **JWT Secret** section
5. Copy the JWT Secret value

### Add to Backend .env:

```bash
cd backend
echo "SUPABASE_JWT_SECRET=your-jwt-secret-here" >> .env
```

Then restart your backend server.

## Backend Changes Summary

### Files Modified:

1. **backend/dependencies.py**
   - Added `from jose import jwt, JWTError` import
   - Added `get_jwt_secret()` helper function
   - Completely rewrote `get_current_user()` function with:
     - Token type detection (anon/service_role/authenticated)
     - Better error messages
     - Two-tier verification (with/without JWT secret)
     - Comprehensive logging

2. **backend/.env.example**
   - Added documentation for all Supabase environment variables
   - Added `SUPABASE_JWT_SECRET` with instructions

3. **test-market-data-api.sh**
   - Updated usage instructions
   - Clarified difference between API keys and session tokens

### No Additional Dependencies Required:

The fix uses `python-jose[cryptography]` which was already in `requirements.txt`.

## Testing Checklist

- [ ] Frontend is running and accessible
- [ ] You've created a user account and can log in
- [ ] You've extracted your session token using the browser console
- [ ] Test script runs with your session token
- [ ] API returns data successfully (not "Authentication failed")
- [ ] (Optional) Added SUPABASE_JWT_SECRET to backend/.env for full security

## Error Messages You Might See

### "You're using the Supabase ANON key"
**Fix:** Don't use `SUPABASE_ANON_KEY`. Get a user session token by logging in.

### "You're using the Supabase SERVICE_ROLE key"
**Fix:** Don't use `SUPABASE_SERVICE_ROLE_KEY`. Get a user session token by logging in.

### "Token has expired"
**Fix:** Your session token expired. Log in again and get a fresh token.

### "User not found"
**Fix:** The user ID in your token doesn't exist. Make sure you're using a token from a valid logged-in session.

## Next Steps

1. **Start your frontend** if not already running:
   ```bash
   npm run dev
   ```

2. **Log in and get your session token** using the browser console method above

3. **Test the API** with the test script using your real session token

4. **(Optional) Add JWT secret** to `.env` for production-grade security

5. **Deploy** once testing is successful

## Questions?

If you're still experiencing authentication issues:

1. Check that your frontend is connecting to the correct Supabase project
2. Verify your user account exists in Supabase Auth
3. Make sure you're copying the entire token (they're long!)
4. Check backend logs for detailed error messages

The authentication system now provides detailed logging, so check your backend logs for specific error details.
