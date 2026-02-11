# Email Templates for Arban's Online

This directory contains email templates for Supabase authentication and user communications via Resend.

## Templates Included

### 1. `magic-link.html` - Magic Link Sign-In Email
Used for passwordless authentication when users sign in or sign up.

**Supabase Variables:**
- `{{ .ConfirmationURL }}` - The magic link URL for authentication
- `{{ .Token }}` - The authentication token
- `{{ .TokenHash }}` - The hashed token
- `{{ .SiteURL }}` - Your site's URL

### 2. `welcome-email.html` - Welcome Email
Send this to new users after their first successful sign-in.

**Variables:**
- `{{ .Email }}` - The user's email address

## How to Use These Templates in Supabase

### Option 1: Custom Supabase Auth Email Templates (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Select the template you want to customize (e.g., "Confirm signup" or "Magic Link")
4. Copy the HTML from `magic-link.html`
5. Paste it into the template editor
6. Click **Save**

### Option 2: Using Resend API Directly

If you want more control (e.g., for welcome emails), you can send emails directly using Resend's API:

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string) {
  try {
    const data = await resend.emails.send({
      from: 'Arban\'s Online <noreply@yourdomain.com>',
      to: [email],
      subject: 'Welcome to Arban\'s Online! 🎺',
      html: `<!-- Paste welcome-email.html content here -->`,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error };
  }
}
```

Then call this function after successful user signup:

```typescript
// app/api/auth/callback/route.ts (or similar)
import { sendWelcomeEmail } from '@/lib/email';

// After user signs in for the first time
if (isNewUser) {
  await sendWelcomeEmail(user.email);
}
```

## Customization Guide

### Update Branding

1. **Colors**:
   - Primary gradient: `#667eea` to `#764ba2`
   - Update these in the CSS to match your brand

2. **Logo**:
   - Replace the emoji `🎺` in the header with an `<img>` tag:
   ```html
   <img src="https://yourdomain.com/logo.png" alt="Arban's Online" style="max-width: 200px;">
   ```

3. **Links**:
   - Update `https://yourdomain.com` with your actual domain
   - Add social media links in the footer

4. **Content**:
   - Modify the copy to match your tone and messaging
   - Update feature descriptions to match your app's features

### Testing Your Emails

1. **Email Client Testing**: Test in multiple email clients
   - Gmail (Desktop & Mobile)
   - Outlook (Desktop & Web)
   - Apple Mail (iOS & macOS)
   - Yahoo Mail

2. **Use Resend's Preview Feature**:
   - Resend dashboard has a preview mode
   - Send test emails to yourself before going live

3. **Check Spam Score**:
   - Use tools like [Mail Tester](https://www.mail-tester.com/)
   - Ensure SPF, DKIM, and DMARC records are set up

## Supabase Variables Reference

Available template variables for Supabase auth emails:

```
{{ .ConfirmationURL }}  - Full magic link URL
{{ .Token }}            - Raw token
{{ .TokenHash }}        - Hashed token
{{ .SiteURL }}          - Your configured site URL
{{ .Email }}            - User's email address
{{ .RedirectTo }}       - Redirect URL (if specified)
```

## Best Practices

1. **Mobile-First**: All templates are responsive and mobile-optimized
2. **Accessibility**: Use semantic HTML and sufficient color contrast
3. **Security**: Always use HTTPS for links and images
4. **CTA Clarity**: Make the call-to-action button prominent and clear
5. **Alternative Links**: Always provide a plain text link as backup
6. **Branding**: Keep consistent with your app's visual identity

## File Structure

```
email-templates/
├── magic-link.html        # Magic link authentication email
├── welcome-email.html     # Welcome email for new users
└── README.md             # This file
```

## Environment Variables Needed

```env
# .env.local
RESEND_API_KEY=re_your_api_key_here
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Troubleshooting

**Emails not sending?**
- Check Resend dashboard logs
- Verify API key has sending permissions
- Ensure sender domain is verified

**Styling issues?**
- Use inline CSS for better email client compatibility
- Test with [Litmus](https://www.litmus.com/) or similar tools
- Avoid complex CSS like flexbox or grid in some clients

**Variables not working?**
- Check spelling and capitalization (they're case-sensitive)
- Ensure you're using the correct syntax: `{{ .VariableName }}`
- Test in Supabase's template editor preview

## Resources

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend Documentation](https://resend.com/docs)
- [Email on Acid](https://www.emailonacid.com/) - Email testing
- [Can I Email](https://www.caniemail.com/) - CSS support in email clients

---

Need help? Check the [Resend setup instructions](../docs/resend-setup.md) or open an issue.
