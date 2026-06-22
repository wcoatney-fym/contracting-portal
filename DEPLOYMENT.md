# Deployment Instructions

## Environment Variables

This application requires the following environment variables to be configured in your hosting platform:

### Required Variables

```
VITE_SUPABASE_URL=https://akhojhncsswyzcnicedt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraG9qaG5jc3N3eXpjbmljZWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjM1MTYsImV4cCI6MjA4MzQ5OTUxNn0.RtCoshv7k0QDgg37LD_fV7XFwiS_ShWs3YTyrXvq74Y
```

## Platform-Specific Setup

### Vercel

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add both variables above
4. Redeploy your application

### Netlify

1. Go to **Site settings**
2. Navigate to **Environment variables**
3. Add both variables above
4. Trigger a new deployment

### Cloudflare Pages

1. Go to **Settings**
2. Navigate to **Environment Variables**
3. Add production variables
4. Redeploy

## Build Command

```bash
npm run build
```

## Troubleshooting

### "Connect to project" or blank page on mobile

This indicates that environment variables are not set in production. Follow the platform-specific setup above.

### Forms not loading

Ensure the environment variables are set exactly as shown above, with no extra spaces or quotes.

### After updating environment variables

Always trigger a new deployment after updating environment variables. Vite bundles these at build time, so changes require a rebuild.
