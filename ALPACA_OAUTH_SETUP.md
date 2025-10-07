# Alpaca OAuth Setup Guide

This guide will help you set up and troubleshoot Alpaca OAuth integration for brokernomex.

## Prerequisites

1. An Alpaca account (paper or live trading)
2. Access to your Alpaca dashboard at https://app.alpaca.markets

## Setup Instructions

### Step 1: Create an OAuth Application in Alpaca

1. Log in to your Alpaca account at https://app.alpaca.markets
2. Navigate to **Settings** → **OAuth Apps** (or go directly to https://app.alpaca.markets/oauth)
3. Click **"Create New OAuth App"**
4. Fill in the application details:
   - **App Name**: `brokernomex` (or your preferred name)
   - **Description**: Brief description of your app
   - **Redirect URI**: This is critical - it must match exactly with your configuration
     - For local development: `http://localhost:6853/api/alpaca/oauth/callback`
     - For production: `https://your-domain.com/api/alpaca/oauth/callback`
   - **Scopes**: Select `account:write` and `trading`
5. Click **"Create Application"**
6. Copy your **Client ID** and **Client Secret** - you'll need these for configuration

### Step 2: Configure Environment Variables

Update your backend `.env` file (in the `backend/` directory) with the OAuth credentials:

```bash
# Alpaca OAuth Configuration
ALPACA_CLIENT_ID=your_client_id_from_alpaca_dashboard
ALPACA_CLIENT_SECRET=your_client_secret_from_alpaca_dashboard
ALPACA_OAUTH_REDIRECT_URI=http://localhost:6853/api/alpaca/oauth/callback

# Frontend URL (where users will be redirected after OAuth)
FRONTEND_URL=http://localhost:5173

# Alpaca Environment (paper or live)
ALPACA_ENV=paper
```

**Important Notes:**
- The `ALPACA_OAUTH_REDIRECT_URI` must **exactly** match what you registered in the Alpaca dashboard
- Include the protocol (`http://` or `https://`)
- Include the port number if not using standard ports
- No trailing slashes
- For production, update all URLs to use your production domain

### Step 3: Restart Your Backend Server

After updating the environment variables, restart your backend server:

```bash
cd backend
python run.py
```

The server should start on port 6853 (or the port configured in your setup).

### Step 4: Test the OAuth Flow

1. Navigate to the Accounts page in your application
2. Click **"Debug OAuth Config"** to verify your configuration
3. Check that all configuration items show green checkmarks
4. If everything is configured correctly, click **"Connect Brokerage"**
5. Select **Alpaca** and enter an account nickname
6. Click **"Connect Account"** - you'll be redirected to Alpaca
7. Authorize the connection on Alpaca's page
8. You'll be redirected back to your application with the connection established

## Common Issues and Solutions

### Issue: "app.alpaca.markets refused to connect"

**Causes:**
- Redirect URI mismatch between your configuration and Alpaca dashboard
- OAuth app not properly registered or approved
- Missing or incorrect environment variables

**Solutions:**
1. Use the **OAuth Configuration Debugger** on the Accounts page
2. Verify the redirect URI matches exactly (check for typos, trailing slashes, ports)
3. Ensure your OAuth app is created and active in the Alpaca dashboard
4. Check backend logs for detailed error messages
5. Verify all environment variables are set correctly

### Issue: "Invalid or expired authorization state"

**Causes:**
- OAuth state token expired (10-minute TTL)
- Server restarted during OAuth flow
- Attempting to reuse an authorization link

**Solutions:**
1. Start the OAuth flow again from the beginning
2. Don't refresh or navigate away during the authorization process
3. Complete the authorization within 10 minutes

### Issue: "Token exchange failed"

**Causes:**
- Incorrect Client Secret
- Network connectivity issues
- Authorization code already used

**Solutions:**
1. Verify your `ALPACA_CLIENT_SECRET` is correct
2. Check server logs for detailed error messages
3. Restart the OAuth flow from the beginning

### Issue: "Failed to fetch account information"

**Causes:**
- Wrong environment selected (paper vs live)
- Account not fully set up in Alpaca
- API endpoint issues

**Solutions:**
1. Verify your Alpaca account is active and funded (if using live trading)
2. Check the `ALPACA_ENV` environment variable matches your account type
3. Try switching between paper and live environments

## Debugging Tools

### OAuth Configuration Checker

The application includes a built-in configuration checker accessible from the Accounts page:

1. Go to **Accounts** page
2. Click **"Debug OAuth Config"** button
3. Review the configuration status:
   - ✓ Green checkmark = configured correctly
   - ✗ Red X = needs attention

### Console Logging

All OAuth operations are logged to the browser console with the `[Alpaca OAuth]` prefix:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for messages starting with `[Alpaca OAuth]`

### Backend Logging

Backend OAuth operations are logged with the `[alpaca]` prefix:

1. Check your backend server console output
2. Look for messages containing `[alpaca]`
3. Errors are logged with `ERROR` level for easy identification

## Paper Trading vs Live Trading

### Paper Trading (Recommended for Testing)
- Set `ALPACA_ENV=paper` in your backend `.env`
- Uses Alpaca's paper trading environment
- No real money is at risk
- Perfect for testing and development

### Live Trading
- Set `ALPACA_ENV=live` in your backend `.env`
- Uses real money
- Requires additional OAuth app approval from Alpaca
- Your OAuth app must be reviewed and approved by Alpaca for live trading

## Security Best Practices

1. **Never commit secrets**: Keep `.env` files out of version control
2. **Use HTTPS in production**: Always use secure connections for OAuth
3. **Rotate credentials**: Periodically regenerate OAuth credentials
4. **Limit scopes**: Only request necessary OAuth scopes
5. **Monitor access**: Regularly review connected applications in your Alpaca dashboard

## Testing Checklist

Before deploying to production, verify:

- [ ] OAuth app created and approved in Alpaca dashboard
- [ ] Client ID and Client Secret configured in backend `.env`
- [ ] Redirect URI matches exactly between app config and Alpaca dashboard
- [ ] Frontend URL configured correctly
- [ ] Backend server running on correct port
- [ ] OAuth flow completes successfully in browser
- [ ] Account information displays correctly after connection
- [ ] Paper trading works as expected
- [ ] Error messages are clear and helpful

## Getting Help

If you continue to experience issues:

1. Check the OAuth Configuration Debugger for specific issues
2. Review backend server logs for detailed error messages
3. Check browser console for frontend errors
4. Verify your Alpaca account status at https://app.alpaca.markets
5. Review Alpaca's OAuth documentation: https://docs.alpaca.markets/docs/using-oauth2-and-trading-api

## Reference URLs

- Alpaca OAuth Apps: https://app.alpaca.markets/oauth
- Alpaca API Documentation: https://docs.alpaca.markets
- OAuth 2.0 Documentation: https://oauth.net/2/
