# Troubleshooting Guide

## "Connect to Project" Button Issue

### Symptoms
- Agents click custom links on mobile
- See "connect to project" button but cannot click it
- URL parameters are correct (`?id=` is present)

### Root Cause
This issue occurs when environment variables are not configured in your production/hosting environment. The application cannot initialize the Supabase client without these credentials.

### Solution

#### Step 1: Add Environment Variables to Your Hosting Platform

**For Vercel:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:
   - `VITE_SUPABASE_URL` = `https://akhojhncsswyzcnicedt.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraG9qaG5jc3N3eXpjbmljZWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjM1MTYsImV4cCI6MjA4MzQ5OTUxNn0.RtCoshv7k0QDgg37LD_fV7XFwiS_ShWs3YTyrXvq74Y`
5. Set environment to **Production** (or all environments)
6. Click **Save**

**For Netlify:**
1. Go to https://app.netlify.com/
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add both variables as shown above
6. Click **Save**

**For Cloudflare Pages:**
1. Go to your Cloudflare Pages dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add variables for **Production** environment
5. Save changes

#### Step 2: Redeploy Your Application

**IMPORTANT:** Environment variables are bundled at build time by Vite. You must trigger a new deployment after adding them.

**Vercel:**
- Go to **Deployments** tab
- Click **...** menu on the latest deployment
- Click **Redeploy**

**Netlify:**
- Go to **Deploys** tab
- Click **Trigger deploy** → **Deploy site**

**Cloudflare Pages:**
- Go to **Deployments**
- Click **Create deployment** or commit a change to trigger rebuild

#### Step 3: Verify the Fix

1. Wait for deployment to complete
2. Visit your production URL
3. Test a custom form link on mobile
4. You should now see the security code entry screen

### Still Not Working?

If you still see the "connect to project" issue after following the above steps:

1. **Check Browser Cache:**
   - Clear browser cache and cookies
   - Try in incognito/private mode
   - Try a different browser

2. **Verify Variables Are Set:**
   - In Vercel/Netlify, check that variables are set for **Production** environment
   - Variable names must be exact (case-sensitive)
   - No extra spaces or quotes around values

3. **Check Deployment Logs:**
   - Look for build errors mentioning environment variables
   - Ensure build completed successfully

4. **Verify URL:**
   - Make sure you're using the production URL (e.g., yourapp.vercel.app)
   - Not a preview URL or local development URL

## Other Common Issues

### Invalid Security Code Error

**Symptoms:** Agent enters security code but sees "Invalid security code" message

**Causes:**
1. Wrong security code entered
2. Link has expired (72 hours)
3. Database agent record doesn't match URL parameter

**Solutions:**
1. Double-check the security code from the email
2. Check expiration date in Agent Tracking page
3. Resend link with new security code using the "Resend" button

### Invalid Form URL Error

**Symptoms:** Immediate error saying "Invalid form URL"

**Causes:**
1. Missing `?id=` parameter in URL
2. Malformed URL

**Solutions:**
1. Ensure complete URL is copied including the `?id=` parameter
2. Regenerate link from Populate Form page

### Forms Not Loading

**Symptoms:** Blank page or loading spinner

**Solutions:**
1. Check browser console for errors (F12 → Console)
2. Verify internet connection
3. Check if Supabase is accessible
4. Contact support with console error details

## Contact Support

If you continue to experience issues:

**Email:** Contracting@teamFYM.com

**Include:**
- Description of the issue
- Screenshots if possible
- Browser console errors (F12 → Console tab)
- Mobile device and browser version
- Hosting platform (Vercel/Netlify/etc.)
