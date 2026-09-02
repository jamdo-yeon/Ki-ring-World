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

## 4. Configure email/password authentication

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` for local development.
3. Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. Under **Authentication → Providers → Email**, enable the Email provider and keep **Confirm email** enabled.
5. Do not enable automatic account linking or add a service-role key to the app.

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
2. Enter an email, password, and matching password confirmation, then create the account.
3. Open the verification email. It returns to the same Ki-ring URL and the app calls the existing atomic `claim_keyring()` function.
4. In Owner Mode, choose **Customize my world ♡**, change the name/currently/theme, and click **Save My World ♡**.
5. Open the exact same URL in an incognito window. The Supabase-saved profile should appear in Visitor Mode without customization, edit, delete, freeze, or save controls.
6. Return to the signed-in browser. It should still show Owner Mode and customization controls.

Later, write the production URL `https://ki-ring.world/k/YOUR_PUBLIC_ID` directly to an NFC tag such as NTAG213. The tag contains only this stable URL, not profile data.

## Phase 2: shared Guestbook

If you already ran `supabase/schema.sql` for Phase 1, do **not** rerun the full schema. Instead:

1. Open your existing project in the Supabase Dashboard.
2. Open **SQL Editor** and create a new query.
3. Paste only the contents of `supabase/phase2_guestbook.sql`.
4. Click **Run** and confirm that `guestbook_entries` appears in **Table Editor**.

The Phase 2 SQL preserves all existing keyrings, claims, and profile data. It allows anonymous and authenticated visitors to add notes to published Ki-rings, prevents logged-in users from spoofing another author ID, and allows only the Ki-ring owner to delete notes.

### Test with two browsers

1. In Browser A, sign in as the owner and open `http://localhost:3000/k/YOUR_PUBLIC_ID`.
2. In Browser B or an incognito window, open the exact same URL without signing in.
3. Open **Guestbook** in Browser B, enter a name and message, then choose **leave a note ♡**.
4. Confirm the new note appears immediately and the message field clears.
5. In Browser A, open Guestbook and choose **refresh notes** (or refresh the page). Confirm the same note appears.
6. Delete the note using the owner-only `×` button in Browser A.
7. In Browser B, choose **refresh notes** or refresh the page. Confirm the deleted note disappears.

The local `/` prototype continues using its original localStorage Guestbook. Only `/k/[publicId]` uses the shared Supabase Guestbook.

## Phase 3: Today / Total visitor counters

For a database that already has Phase 1 and Phase 2, run only the incremental Phase 3 file:

1. Open the existing Supabase project.
2. Open **SQL Editor** and create a new query.
3. Paste only the contents of `supabase/phase3_visit_counter.sql`.
4. Click **Run** and confirm that `keyring_visits` appears in **Table Editor**.

Each browser receives a random anonymous UUID generated with `crypto.randomUUID()`. It is stored locally as `kiring-visitor-id`; it is not an account ID, email address, IP address, or personal profile value. The database uniqueness rule allows that browser token to count only once per Ki-ring per database calendar day. Refreshing or reopening the page on the same day does not add another row, while a different browser or a later day can count again.

The recording RPC checks `auth.uid()` on the server. If the current authenticated user owns the target Ki-ring, it skips the insert. Raw visit rows and visitor tokens have no public table permissions; clients can only call the recording RPC and retrieve aggregate Today/Total numbers.

### Test deduplication and owner exclusion

1. In Browser A, sign in as the owner and open `http://localhost:3000/k/YOUR_PUBLIC_ID`.
2. Note Today/Total, then refresh Browser A ten times. The values must not increase from owner visits.
3. In Browser B or an incognito window, open the same URL while logged out. Today and Total should each increase once.
4. Refresh Browser B ten times. The values must remain unchanged because its stable token already counted today.
5. Open the URL in Browser C, another browser profile, or another device. Today and Total should each increase once more.
6. Return to Browser A and refresh to see the latest aggregate counts.

`TODAY` means rows whose `visited_on` equals the Supabase database `current_date`. `TOTAL` means all accepted daily visit rows accumulated for the Ki-ring. Clearing browser storage creates a new anonymous token and therefore behaves like a new browser.

## Deploy to Vercel for NFC testing

Ki-ring World uses standard Next.js deployment and does not require a `vercel.json`. Authentication redirects use the browser/request origin, so the same code works on localhost and on the generated Vercel HTTPS domain.

### 1. Push the repository to GitHub

Commit the application files, `supabase/phase2_guestbook.sql`, `supabase/phase3_visit_counter.sql`, and this documentation, then push to your GitHub repository. Never commit `.env.local`.

### 2. Import it into Vercel

1. Sign in at [vercel.com](https://vercel.com) using GitHub.
2. Choose **Add New → Project**.
3. Import the `jamdo-yeon/Ki-ring-World` repository.
4. Leave the detected framework as **Next.js** and keep the standard build settings.

### 3. Add production environment variables

In the Vercel project’s **Environment Variables** section, add these to the **Production** environment:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Use the Project URL and publishable key from Supabase’s **Connect** or **Project Settings → API** screen. These are the only Supabase variables the production app requires. Do not add a service-role key, secret key, database password, or the contents of `.env.local` as a file.

### 4. Deploy and copy the stable production URL

Choose **Deploy**. When it succeeds, open the project’s **Domains** section and copy its production URL, for example:

```text
https://YOUR_PROJECT.vercel.app
```

Use the production domain rather than a temporary preview-deployment URL for the NFC card.

### 5. Configure Supabase Authentication URLs

In Supabase, open **Authentication → URL Configuration** and set:

```text
Site URL:
https://YOUR_PROJECT.vercel.app

Redirect URL:
https://YOUR_PROJECT.vercel.app/auth/callback
```

Keep `http://localhost:3000/auth/callback` in the Redirect URLs list for local email verification and password-reset testing. The application includes the original `/k/[publicId]` path in the callback’s validated `next` parameter, so a user who starts at `/k/abc123` returns to that Ki-ring after verification or password recovery.

Under **Authentication → Providers → Email**, keep the Email provider and **Confirm email** enabled. Returning owners use email/password directly and do not receive a verification email on every login.

### Existing Magic-Link-only owner

An account originally created through a Magic Link may not have a password. It keeps the same Supabase user ID and therefore keeps ownership of its existing Ki-ring. On the claimed Ki-ring, open **owner? sign in**, enter the existing account email, and choose **forgot password?**. Open the reset email, set a new password, and return to the same Ki-ring. Do not create a replacement account, because a new account would have a different user ID and would not own the existing Ki-ring.

If you intentionally test Vercel Preview Deployments, add the exact preview callback URL to Supabase first. Do not rely on preview URLs for the physical NFC card because they can change.

### 6. Test the production Ki-ring flow

Given a real public ID such as `abc12345`, open:

```text
https://YOUR_PROJECT.vercel.app/k/abc12345
```

1. On the owner device, sign in with the owner email and password and confirm the same Ki-ring becomes Owner Mode.
2. Confirm Owner Mode still shows customization and owner-only Guestbook deletion.
3. Open the exact URL on an incognito browser or a separate phone and confirm Visitor Mode appears without edit controls.
4. Post a Guestbook entry anonymously and confirm the owner can refresh and see it.
5. Confirm Today/Total increments once for the visitor device, does not increase on repeated refreshes that day, and does not increase for the authenticated owner.

### 7. Write the NFC card

Write only the stable HTTPS URL to the NTAG215:

```text
https://YOUR_PROJECT.vercel.app/k/YOUR_PUBLIC_ID
```

Do not store an authentication token, user ID, owner ID, email address, Supabase URL/key, or any other profile data on the NFC card. Test the NFC record before permanently locking the tag.
