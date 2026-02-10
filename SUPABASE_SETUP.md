# Supabase Setup Guide for Video Submissions

This guide will walk you through setting up Supabase for the dynamic video submission feature.

## Prerequisites

- A Supabase account (free tier works great!)
- Your Arban's Online app running locally or deployed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the details:
   - **Name**: `arbans-online` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region to your users
4. Click "Create new project" and wait for it to finish (~2 minutes)

## Step 2: Set Up Environment Variables

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (starts with `https://...supabase.co`)
   - **anon public** key (under "Project API keys")

3. Create/update `.env.local` in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 3: Run the Database Schema

1. In your Supabase project, go to the **SQL Editor** tab
2. Copy the contents of `lib/supabase/schema.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the schema

This will create:
- `video_submissions` table for storing video entries
- `admins` table for managing admin users
- Row Level Security (RLS) policies
- Necessary indexes for performance

## Step 4: Set Up Authentication

1. In Supabase, go to **Authentication** > **Providers**
2. Enable **Email** provider (it's usually enabled by default)
3. Configure email settings (optional):
   - Go to **Authentication** > **Email Templates** to customize the magic link email
   - For production, set up a custom SMTP provider

## Step 5: Add Your First Admin

To access the admin dashboard, you need to add yourself as an admin:

1. First, sign in to your app using the video submission form
2. Check your email for the magic link and click it
3. Once signed in, find your user ID:
   - Go to Supabase **Authentication** > **Users**
   - Copy your user ID (UUID format)

4. Add yourself as an admin via SQL Editor:

```sql
INSERT INTO admins (user_id, email)
VALUES ('your-user-id-here', 'your@email.com');
```

## Step 6: Test the Setup

1. Restart your Next.js dev server: `npm run dev`
2. Navigate to any page in the book
3. Click the green "+" button to submit a video
4. Sign in with your email
5. Submit a test video
6. Check Supabase **Table Editor** > `video_submissions` to see your submission

## Step 7: Migrate Existing Videos (Optional)

If you have videos in the old `config/exerciseVideos.ts` file, you can migrate them:

1. Go to Supabase **SQL Editor**
2. For each video, run:

```sql
INSERT INTO video_submissions (page_number, video_id, title, performer, description, submitted_by, status)
VALUES (285, 'PgGyqddyFK0', 'Paul Mayes plays Arban Study No.1', 'Paul Mayes', 'Performance of Arban Study No.1', 'system', 'approved');
```

Replace the values with your actual video data. Use `'system'` as the `submitted_by` value for migrated videos.

## Troubleshooting

### "Authentication required" error
- Make sure you're signed in (check for auth cookie)
- Verify environment variables are set correctly
- Restart your dev server after adding env variables

### Videos not showing up
- Check if videos are approved (status = 'approved')
- Verify RLS policies are enabled
- Check browser console for API errors

### Can't submit videos
- Ensure you're signed in
- Check Supabase logs in **Database** > **Logs**
- Verify the API routes are working: try accessing `/api/videos/285` directly

## Admin Dashboard (Coming Soon)

An admin dashboard for moderating submissions will be added in a future update. For now, you can manage submissions via:
- Supabase Table Editor
- SQL queries in the SQL Editor
- Direct API calls to `/api/admin/submissions`

## Security Notes

- Never commit `.env.local` to version control
- The `anon` key is safe to expose in client-side code (it's public)
- Row Level Security policies ensure users can only modify their own submissions
- Admins table controls who can approve/reject videos
- Consider setting up email rate limiting in production

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- Check the project's GitHub issues
