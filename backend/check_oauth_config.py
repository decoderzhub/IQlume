#!/usr/bin/env python3
import os
import sys
from pathlib import Path

def load_env_file(env_path):
    """Simple .env file loader without dependencies"""
    if not env_path.exists():
        return {}

    env_vars = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    return env_vars

env_file = Path(__file__).parent / ".env"
env_vars = load_env_file(env_file)

for key, value in env_vars.items():
    if key not in os.environ:
        os.environ[key] = value

def check_config():
    print("=" * 60)
    print("Alpaca OAuth Configuration Check")
    print("=" * 60)
    print()

    issues = []
    warnings = []

    env_file = Path(__file__).parent / ".env"

    if not env_file.exists():
        print("❌ CRITICAL: backend/.env file does NOT exist!")
        print()
        print("This is the root cause of your OAuth connection issue.")
        print()
        print("To fix:")
        print("  1. cp backend/.env.example backend/.env")
        print("  2. Edit backend/.env and add your Alpaca OAuth credentials")
        print("  3. Restart your backend server")
        print()
        return False
    else:
        print("✓ backend/.env file exists")

    print()
    print("Checking required OAuth environment variables:")
    print()

    required_vars = {
        "ALPACA_CLIENT_ID": "OAuth Client ID from Alpaca dashboard",
        "ALPACA_CLIENT_SECRET": "OAuth Client Secret from Alpaca dashboard",
        "ALPACA_OAUTH_REDIRECT_URI": "OAuth redirect URI (must match Alpaca dashboard)",
        "FRONTEND_URL": "Frontend URL for OAuth redirects",
    }

    optional_vars = {
        "ALPACA_ENV": "Trading environment (paper or live)",
        "SUPABASE_URL": "Supabase URL for database",
        "SUPABASE_SERVICE_ROLE_KEY": "Supabase service role key",
    }

    all_good = True

    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value or value.startswith("your_"):
            print(f"❌ {var}")
            print(f"   {description}")
            print(f"   Status: NOT SET or using template value")
            issues.append(var)
            all_good = False
        else:
            if var == "ALPACA_CLIENT_ID":
                preview = value[:8] + "..." if len(value) > 8 else value
                print(f"✓ {var}: {preview}")
            elif var == "ALPACA_CLIENT_SECRET":
                print(f"✓ {var}: [HIDDEN]")
            elif var == "ALPACA_OAUTH_REDIRECT_URI":
                print(f"✓ {var}: {value}")
                if not value.startswith(("http://", "https://")):
                    print(f"   ⚠️  WARNING: Should start with http:// or https://")
                    warnings.append(f"{var} should start with http:// or https://")
            else:
                print(f"✓ {var}: {value}")

    print()
    print("Optional configurations:")
    print()

    for var, description in optional_vars.items():
        value = os.getenv(var)
        if not value or value.startswith("your_"):
            print(f"⚠️  {var}: Not configured")
            warnings.append(f"{var} not configured")
        else:
            if "KEY" in var or "SECRET" in var:
                print(f"✓ {var}: [CONFIGURED]")
            else:
                print(f"✓ {var}: {value}")

    print()
    print("=" * 60)

    if all_good and not issues:
        print("✓ All required OAuth configurations are set!")
        print()
        if warnings:
            print(f"⚠️  {len(warnings)} warnings found:")
            for warning in warnings:
                print(f"   - {warning}")
        else:
            print("✓ No issues found. Your OAuth setup should work.")
        print()
        print("Next steps:")
        print("  1. Make sure your backend server is running")
        print("  2. Visit the Accounts page in your app")
        print("  3. Click 'Debug OAuth Config' to verify from the app")
        print("  4. Try connecting to Alpaca")
        return True
    else:
        print(f"❌ {len(issues)} critical issues found!")
        print()
        print("Issues to fix:")
        for issue in issues:
            print(f"   - {issue} needs to be configured")
        print()
        print("To fix:")
        print("  1. Go to https://app.alpaca.markets/oauth")
        print("  2. Create or view your OAuth app")
        print("  3. Copy Client ID and Client Secret")
        print("  4. Update backend/.env with these values")
        print("  5. Restart your backend server")
        print("  6. Run this script again to verify")
        return False

if __name__ == "__main__":
    success = check_config()
    sys.exit(0 if success else 1)
