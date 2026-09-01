# Supabase setup for Ki-ring World

The homepage (`/`) remains the original local-only prototype. NFC Ki-rings use `/k/[publicId]`: Supabase is the source of truth for the core profile, while windows, diary, photos, guestbook, and capsules remain scoped local prototype data for this phase.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com), create an account, and choose **New project**.
2. Wait for the database to finish provisioning.
3. In Supabase, open **Project Settings → API** (in some dashboard versions: **Connect**).
4. Copy the **Project URL** and the public **anon** or **publishable** key. Do not use the service-role/secret key in this app.

## 2. Configure Next.js

Create `.env.local` in the repository root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

The committed `.env.example` shows the same variable names. Restart the dev server whenever these values change.

## 3. Create the database

1. Open **SQL Editor** in Supabase.
2. Create a new query.
3. Paste the entire contents of `supabase/schema.sql` and click **Run**.

This creates `keyrings`, `profiles`, their Row Level Security policies, the atomic `claim_keyring` function, and a SQL-only development helper.

## 4. Configure magic-link authentication

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` for local development.
3. Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. Ensure the Email provider is enabled under **Authentication → Providers**.

## 5. Create an unclaimed development Ki-ring

In Supabase SQL Editor, run:

```sql
select * from public.create_test_keyring();
```

Copy the returned `public_id`. This helper is revoked from `anon` and `authenticated`, so it cannot be called through the public app. You can also create a predictable test ID manually:

```sql
insert into public.keyrings (public_id) values ('test1234');
```

Public IDs must be 6–64 characters and contain only letters, numbers, `_`, or `-`.

## 6. Run and test the complete flow

```bash
npm install
npm run dev
```

If the generated ID is `test1234`, open:

`http://localhost:3000/k/test1234`

1. Confirm the waiting/activation screen appears.
2. Enter your email and use the magic link. It returns to the same Ki-ring URL.
3. Click **Claim this Ki-ring ♡**.
4. In Owner Mode, choose **Customize my world ♡**, change the name/currently/theme, and click **Save My World ♡**.
5. Open the exact same URL in an incognito window. The Supabase-saved profile should appear in Visitor Mode without customization, edit, delete, freeze, or save controls.
6. Return to the signed-in browser. It should still show Owner Mode and customization controls.

Later, write the production URL `https://ki-ring.world/k/YOUR_PUBLIC_ID` directly to an NFC tag such as NTAG213. The tag contains only this stable URL, not profile data.
