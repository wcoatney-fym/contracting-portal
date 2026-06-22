# Zapier Integration Setup Guide

This guide explains how to set up the Zapier integration to automatically add new hires from GoHighLevel (GHL) to the Contracting Portal.

## Overview

When a hiring manager moves a candidate to "Hired" status in GHL, Zapier automatically sends the agent's information to the portal, where it appears in the "New Hires" tab. The manager can then quickly populate and send intake forms with pre-filled data.

## Prerequisites

1. Active Zapier account
2. GoHighLevel (GHL) account with API access
3. Your Contracting Portal deployed and accessible
4. Webhook URL from your portal

## Webhook URL

Your webhook endpoint is:

```
[YOUR_SUPABASE_URL]/functions/v1/new-hire-webhook
```

Replace `[YOUR_SUPABASE_URL]` with your actual Supabase URL (found in your `.env` file as `VITE_SUPABASE_URL`).

Example:
```
https://akhojhncsswyzcnicedt.supabase.co/functions/v1/new-hire-webhook
```

## Step-by-Step Zapier Setup

### Step 1: Create a New Zap

1. Log in to [Zapier](https://zapier.com)
2. Click "Create Zap" or "Make a Zap"
3. Name your Zap: "GHL New Hire to Contracting Portal"

### Step 2: Set Up the Trigger (GHL)

1. **Choose App:** Search for and select "GoHighLevel"
2. **Choose Trigger Event:** Select one of:
   - "Updated Contact" (recommended)
   - "Contact Status Changed"
   - Or the specific trigger that fires when moving to "Hired"
3. **Connect Account:** Connect your GHL account if not already connected
4. **Configure Trigger:**
   - Set filter to detect when status/stage becomes "Hired"
   - You may need to use Zapier's "Filter" step after the trigger
5. **Test Trigger:** Find a sample contact to test with

### Step 3: Add Filter (Optional but Recommended)

1. Click the "+" button to add a step
2. Choose "Filter" by Zapier
3. **Set Condition:**
   - Only continue if...
   - Contact Status / Stage
   - Exactly matches
   - "Hired" (or your exact status name in GHL)

This ensures the Zap only runs for hired candidates.

### Step 4: Set Up the Webhook Action

1. Click the "+" button to add an action step
2. **Choose App:** Search for and select "Webhooks by Zapier"
3. **Choose Action Event:** Select "POST"
4. **Set Up Action:**

   **URL:**
   ```
   https://[your-supabase-url].supabase.co/functions/v1/new-hire-webhook
   ```

   **Payload Type:** Select "json"

   **Data:** Add these fields (map from GHL contact fields):

   | Key | Value (from GHL) |
   |-----|------------------|
   | `firstName` | Contact First Name |
   | `lastName` | Contact Last Name |
   | `email` | Contact Email |
   | `phoneNumber` | Contact Phone Number |

   Example mapping in Zapier:
   ```json
   {
     "firstName": [GHL: Contact First Name],
     "lastName": [GHL: Contact Last Name],
     "email": [GHL: Contact Email],
     "phoneNumber": [GHL: Contact Phone]
   }
   ```

   **Headers:** (optional, but recommended)
   - Content-Type: `application/json`

5. **Unflatten:** Leave as "No"

### Step 5: Test the Webhook

1. Click "Test action"
2. Zapier will send a test request to your webhook
3. You should see a success response:
   ```json
   {
     "success": true,
     "message": "New hire added successfully",
     "data": { ... }
   }
   ```
4. Check your "New Hires" tab in the portal - the test contact should appear

### Step 6: Turn On Your Zap

1. Review all steps
2. Name your Zap if you haven't already
3. Click "Turn on Zap"
4. Your Zap is now live

## Webhook Payload Format

The webhook expects a POST request with this JSON structure:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+1234567890"
}
```

### Required Fields

All four fields are required:
- `firstName` (string) - Agent's first name
- `lastName` (string) - Agent's last name
- `email` (string) - Agent's email address (must be unique)
- `phoneNumber` (string) - Agent's phone number

### Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 201 | Success | New hire added successfully |
| 400 | Bad Request | Missing required fields |
| 409 | Conflict | Email already exists (duplicate) |
| 500 | Server Error | Internal server error |

## Workflow After Zapier Integration

1. **Hiring manager moves candidate to "Hired" in GHL**
   - Zap triggers automatically

2. **Agent appears in "New Hires" tab**
   - Shows first name, last name, email, phone
   - Status is "Pending" (yellow badge)
   - Real-time updates via Supabase

3. **Manager clicks "Populate Form" button**
   - Redirects to "Populate Form" tab
   - Agent data is pre-filled
   - Manager selects form type

4. **Manager populates and sends form**
   - Form URL and security code generated
   - Email body ready to copy/send
   - Can use webhook to send automatically

5. **New hire marked as "Processed"**
   - Status changes to "Processed" (green badge)
   - Record remains in table for reference

## Troubleshooting

### Zap Not Triggering

**Check:**
- Is your Zap turned on?
- Does the trigger filter match your GHL status exactly? (case-sensitive)
- Are you testing with a contact that actually moved to "Hired"?

**Solution:**
- Check Zap History in Zapier to see if it's running
- Review trigger conditions and filters
- Test the trigger step manually

### Webhook Returns 400 Error

**Error:** "Missing required fields"

**Check:**
- Are all four fields mapped in Zapier?
- Do the GHL fields contain data?
- Check the Zap History to see the exact data being sent

**Solution:**
- Map each field correctly from GHL contact data
- Ensure test contact has all required information
- Use Zapier's "Formatter" if field names don't match

### Webhook Returns 409 Error

**Error:** "Duplicate entry - An agent with this email already exists"

**Meaning:** The email address is already in the new_hires table

**Solutions:**
- This is expected behavior to prevent duplicates
- Delete the old record from "New Hires" tab
- Or use a different email address for testing

### Agent Not Appearing in Portal

**Check:**
- Is webhook returning success (201)?
- Are you logged in to the portal?
- Is the "New Hires" tab loading correctly?

**Solution:**
- Check browser console for errors
- Refresh the "New Hires" page
- Verify Supabase connection and RLS policies

### Pre-filled Data Not Working

**Check:**
- Did you click "Populate Form" button from New Hires tab?
- Is the PopulateForm page loading?

**Solution:**
- Use the "Populate Form" button (not the navigation link)
- Check browser console for navigation errors

## Testing Your Integration

### Manual Test via Webhook

You can test the webhook directly using curl:

```bash
curl -X POST https://[your-supabase-url].supabase.co/functions/v1/new-hire-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Agent",
    "email": "test.agent@example.com",
    "phoneNumber": "+1234567890"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "New hire added successfully",
  "data": {
    "id": "...",
    "first_name": "Test",
    "last_name": "Agent",
    "email": "test.agent@example.com",
    "phone_number": "+1234567890",
    "processed": false,
    "created_at": "..."
  }
}
```

### End-to-End Test

1. Create a test contact in GHL
2. Move the contact to "Hired" status
3. Wait 1-2 minutes for Zapier to process
4. Check "New Hires" tab in portal
5. Click "Populate Form" button
6. Verify data is pre-filled
7. Select form type and generate form
8. Verify agent moves to "Processed" status

## Security Considerations

1. **No JWT Verification:** The webhook is public and doesn't require authentication
   - This is intentional to allow Zapier to POST data
   - Consider adding a secret key in the future for additional security

2. **Email Uniqueness:** Emails must be unique to prevent duplicates
   - The database enforces this constraint
   - Duplicate attempts return 409 error

3. **Data Validation:** All fields are validated server-side
   - Missing fields return 400 error
   - Invalid data types are rejected

4. **CORS Enabled:** The webhook allows cross-origin requests
   - Required for external services like Zapier
   - Does not expose sensitive data

## Support

If you encounter issues:

1. Check Zapier Zap History for errors
2. Review webhook logs in Supabase Functions
3. Test webhook manually with curl
4. Check browser console in the portal
5. Verify all environment variables are set correctly

## Advanced: Custom Zap Actions

You can enhance the Zap with additional steps:

### Send Welcome Email
- Add "Gmail" or "Email by Zapier" action
- Send welcome email to new hire after webhook succeeds

### Slack Notification
- Add "Slack" action
- Notify team channel when new hire is added

### Google Sheets Logging
- Add "Google Sheets" action
- Log all new hires to a spreadsheet for tracking

### Multiple Webhooks
- Create separate Zaps for different hire types
- Use filters to route to different form types
- Pre-select form type based on GHL tags/custom fields
