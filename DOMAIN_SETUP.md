# Domain Setup Guide

This guide explains how to configure your custom domain for the agent intake forms.

## The Problem

When you shorten or customize your domain in Bolt.new, the agent form URLs need to use the correct production domain. By default, the system uses `window.location.origin`, which can cause issues if:

1. You access the admin portal from different URLs
2. The domain changes after forms are generated
3. Environment variables aren't configured on the new domain

## The Solution

Configure `VITE_APP_URL` to explicitly set your production domain.

## Setup Steps

### 1. Update Local .env File

Edit `.env` and set your production domain:

```env
VITE_APP_URL=https://your-shortened-bolt-domain.com
```

Replace `https://your-shortened-bolt-domain.com` with your actual Bolt.new shortened URL.

### 2. Configure Bolt.new Environment Variables

You need to add THREE environment variables in Bolt.new:

**In Bolt.new editor:**
1. Click Settings (gear icon) or look for "Environment Variables" section
2. Add these three variables:

```
VITE_SUPABASE_URL=https://akhojhncsswyzcnicedt.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key-from-.env]
VITE_APP_URL=https://your-shortened-bolt-domain.com
```

**Important:** Copy the exact values from your `.env` file for the Supabase variables.

### 3. Configure Supabase CORS

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`akhojhncsswyzcnicedt`)
3. Go to **Settings** → **API**
4. Find **URL Configuration** or **CORS Settings**
5. Add your shortened Bolt domain to allowed origins:
   ```
   https://your-shortened-bolt-domain.com
   ```
6. Save changes

### 4. Rebuild and Deploy in Bolt.new

After configuring environment variables:
1. Trigger a rebuild in Bolt.new (may happen automatically)
2. Wait for deployment to complete
3. Check build logs for any errors

### 5. Verify Setup

1. Access the admin portal using your NEW shortened domain
2. Create a test form in "Populate Form" section
3. Check the generated URL - it should use your shortened domain
4. Test the agent link to ensure it loads correctly

## Troubleshooting

### Forms Still Use Wrong Domain

**Check:** Are you accessing the admin portal from the correct domain?
- Access from: `https://your-shortened-bolt-domain.com/dashboard`
- NOT from: Old Bolt URLs or localhost

**Check:** Is `VITE_APP_URL` set correctly?
- Open browser console on admin portal
- Type: `import.meta.env.VITE_APP_URL`
- Should return your production domain

### Agent Forms Don't Load

**Check:** Supabase CORS settings
- Make sure your domain is in the allowed origins list
- Include the protocol (https://)
- Don't include trailing slashes

**Check:** Environment variables in Bolt.new
- All three variables must be set
- Values must match your `.env` file exactly
- Rebuild after adding variables

### Warning Banners in Admin Portal

**Blue "Domain Configuration Notice":**
- You're accessing from a different domain than configured
- Forms will still work, but verify the URL is correct

**Yellow "VITE_APP_URL Not Configured":**
- The environment variable is not set
- Forms will use current domain (may break if URL changes)
- Set the variable and rebuild

## How It Works

1. **Environment Variable:** `VITE_APP_URL` explicitly sets the production domain
2. **URL Generation:** System uses configured URL (or falls back to current domain)
3. **Warning System:** Alerts you if there's a mismatch between configured and current domain

## Best Practices

1. **Always set VITE_APP_URL** in production environments
2. **Access admin from production domain** when generating forms
3. **Regenerate old forms** if you change domains (old links will break)
4. **Test agent links** on mobile before sending to real agents
5. **Keep .env and Bolt.new variables in sync**

## Quick Reference

### Environment Variables Needed

| Variable | Where to Set | Purpose |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | .env + Bolt.new | Database connection |
| `VITE_SUPABASE_ANON_KEY` | .env + Bolt.new | Database auth |
| `VITE_APP_URL` | .env + Bolt.new | Production domain |

### Locations to Update

1. **Local:** `.env` file in project root
2. **Bolt.new:** Environment variables in project settings
3. **Supabase:** CORS settings in API configuration

## Need Help?

If forms still don't work after following these steps:
1. Check browser console for errors
2. Verify all three environment variables are set in Bolt.new
3. Confirm Supabase CORS includes your domain
4. Try clearing browser cache and regenerating forms
