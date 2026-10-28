# Bayanihan Dabaw

A mobile-first community platform for Davao City. Members can publish community updates, share photos, request help, follow neighbors, discuss posts, save updates, report harmful content, and choose to include their own wallet QR code on a post.

## Stack

- Next.js App Router, React, TypeScript (strict mode), and Tailwind CSS 4
- MongoDB Atlas with Mongoose models and indexed relationships
- Opaque, database-backed sessions in HTTP-only SameSite cookies; bcrypt password hashes
- Zod request validation and MongoDB-backed rate limits
- Signed Cloudinary uploads and Resend transactional email
- Vercel deployment configuration

## Local setup

Use Node.js 24 LTS (Next.js 16 requires Node.js 20.9 or later) and npm.

1. Install the project dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the required values. Keep server credentials out of `NEXT_PUBLIC_*` variables.

3. Create a MongoDB Atlas database. Allow access only from the addresses you need, create a database user with least privilege, and use the URI-encoded database credentials in `MONGODB_URI`.

4. Create a Cloudinary account. Set the cloud name, API key, and API secret. Uploads use a short-lived server-generated signature, a per-account media folder, and image format and size limits.

5. Create a Resend account and verify a sender/domain. Set `RESEND_API_KEY` and `EMAIL_FROM`. Email verification and password reset links are delivered through this provider. Without Resend configured, local mode records a safe email preview in the server log but never prints a one-time URL or token.

6. Start the development server:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000`.

## First administrator

Set `INITIAL_ADMIN_EMAIL` to the email address you will use for the first administrator account **before registering it**. Registration assigns the admin role only when that exact email matches the server variable. After the account is created, verify the email and **remove `INITIAL_ADMIN_EMAIL` from the environment**. Ordinary users cannot promote themselves. The same bootstrap email may be used again for another account only if that email is later available, so keep this value restricted to the initial setup window.

Administrator actions are authorized on the server and recorded in the moderation audit log. Admins can review user reports, remove posts/comments, and suspend or restore non-admin accounts. Suspended accounts lose active sessions and their posts are hidden while the suspension is active.

## Routes

| Area | Routes |
| --- | --- |
| Public community | `/`, `/explore`, `/post/[id]`, `/u/[username]`, `/u/[username]/followers`, `/u/[username]/following` |
| Authentication | `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Member features | `/following`, `/create`, `/notifications`, `/saved`, `/settings` |
| Moderation | `/admin`, `/admin/reports`, `/admin/users` |
| Policies | `/terms`, `/privacy` |

API route handlers validate payloads, return structured errors, and check authentication and ownership for protected operations. Public feeds use cursor pagination. Likes, follows, and bookmarks have compound unique indexes. A post’s optional donation QR is shown only when that post explicitly enables donations.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

The test suite uses an ephemeral MongoDB instance to check account uniqueness, password hashing, one-time reset token behavior, post and donation validation, unique likes/follows/bookmarks, comment/report validation, cursor encoding, and uploaded-media ownership. Email delivery, real Cloudinary uploads, and live MongoDB Atlas connectivity require the corresponding external credentials and should also be checked in a staging environment.

## Vercel deployment

1. Push the repository to a private GitHub repository.
2. In Vercel, import that repository and keep the Next.js framework preset.
3. Add the production environment variables from `.env.example`: `APP_URL`, `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, and `EMAIL_FROM`. Set `APP_URL` to the final HTTPS deployment domain.
4. To provision the first admin, temporarily set `INITIAL_ADMIN_EMAIL` to the intended account email. Register that account, confirm its admin role in MongoDB, then remove this variable from every Vercel environment.
5. Set MongoDB Atlas network access for Vercel deployments. Prefer Vercel Secure Compute/static egress or a narrow IP allowlist if available; avoid opening the database to the entire internet unless you have made and documented that tradeoff. Use a dedicated MongoDB user and a strong, URI-encoded password.
6. Confirm Cloudinary and Resend credentials in the production environment. Verify the sender/domain in Resend so verification and reset links can be delivered.
7. Deploy. Then test registration, duplicate email/username rejection, email verification, login/logout, password reset and token reuse, signed photo uploads, post creation/edit/delete, likes, comments, follows, bookmarks, public share links, donation QR display, reporting, account suspension, and admin access.

Vercel’s filesystem is not used for persistent uploads. Database connections are reused across serverless invocations. Application pages avoid requiring credentials during static compilation; protected APIs report a setup error if a needed provider is not configured.

## Before opening to the public

- The `/terms` and `/privacy` pages are implementation-aware draft copy. A qualified Philippine legal/privacy professional should review them, name the data controller/operator, set an effective date, add contact details, and define the operational request/retention process.
- Establish a monitored support/moderation contact and incident response procedure.
- Decide and publish the platform’s age policy and confirm it meets applicable requirements.
- Run the deployment checks using real staging accounts and service credentials.

No payment is processed in this version. Bayanihan Dabaw does not hold funds, mark donations as complete, verify wallet ownership, claim community reports as confirmed, or represent user posts as official government announcements.
