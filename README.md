# FYM Financial - Agent Contracting Portal

A web application for managing agent intake forms and contracting processes.

## Features

- Generate custom agent intake forms with security codes
- Track agent progress through contracting workflow
- Store completed form submissions and uploaded documents
- Support for multiple form types: Life Only, Field, Direct Pay, and Telesales

## Environment Setup

### Required Environment Variables

This application requires Supabase credentials to function. You must configure these in your hosting platform:

```
VITE_SUPABASE_URL=https://akhojhncsswyzcnicedt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraG9qaG5jc3N3eXpjbmljZWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjM1MTYsImV4cCI6MjA4MzQ5OTUxNn0.RtCoshv7k0QDgg37LD_fV7XFwiS_ShWs3YTyrXvq74Y
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for various hosting platforms.

### Quick Deploy

#### Vercel
1. Connect your repository to Vercel
2. Add environment variables in project settings
3. Deploy

#### Netlify
1. Connect your repository to Netlify
2. Add environment variables in site settings
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Troubleshooting

### Custom Links Not Working

If agents report seeing "connect to project" or forms not loading:

1. **Check Environment Variables**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in your hosting platform
2. **Redeploy**: After adding/updating environment variables, trigger a new deployment
3. **Clear Cache**: If using a CDN, clear the cache after deploying
4. **Check URL**: Ensure agents are using the production URL, not a preview/development URL

### Forms Show Configuration Error

This means environment variables are not configured. Follow the deployment instructions to add them.

## Support

For technical support, contact: Contracting@teamFYM.com
