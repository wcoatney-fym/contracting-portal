# Deployment Checklist

Use this checklist to ensure your deployment is configured correctly.

## Pre-Deployment

- [ ] Code is committed to your Git repository
- [ ] Repository is connected to hosting platform (Vercel/Netlify/Cloudflare)

## Environment Variables Configuration

### Required Variables (Must be set in hosting platform)

- [ ] `VITE_SUPABASE_URL` is set to: `https://akhojhncsswyzcnicedt.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` is set to the correct key
- [ ] Variables are set for **Production** environment
- [ ] No extra spaces or quotes in variable values

## Build Configuration

- [ ] Build command is set to: `npm run build`
- [ ] Output directory is set to: `dist`
- [ ] Node version is 18 or higher

## Post-Deployment

- [ ] Deployment completed successfully
- [ ] No build errors in deployment logs
- [ ] Production URL is accessible
- [ ] Test admin login works
- [ ] Test generating a custom form link
- [ ] Test custom form link on mobile device
- [ ] Security code gate appears correctly
- [ ] Form submission works

## Testing Custom Links

1. Generate a test form:
   - [ ] Log into admin dashboard
   - [ ] Go to "Populate Form"
   - [ ] Enter test agent details
   - [ ] Click "Populate Form"
   - [ ] Copy the generated URL

2. Test on mobile:
   - [ ] Open URL on mobile device
   - [ ] Security code entry screen appears (NOT "connect to project")
   - [ ] Enter security code
   - [ ] Form loads correctly
   - [ ] Can fill out all fields
   - [ ] Can submit form

3. Verify in dashboard:
   - [ ] Agent appears in "Agent Tracking"
   - [ ] Status updates correctly
   - [ ] Submission appears in "Agent Database"

## If Issues Occur

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions to common problems.

### Quick Fixes

**"Connect to project" error:**
→ Environment variables not set. Add them and redeploy.

**"Invalid security code":**
→ Check code matches what was sent. Check link hasn't expired.

**Blank page:**
→ Check browser console for errors. Verify Supabase connection.

## Support

For assistance: Contracting@teamFYM.com
