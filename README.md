# AIRDROPX — COMPLETE STATIC + SUPABASE WEBSITE

## What this is
A no-build, no-npm, no-GitHub-Actions Web3 campaign/reward platform.

### Public routes
- `/`
- `/airdrops`
- `/airdrops/telegram-bots`
- `/airdrops/testnets`
- `/airdrops/nft-whitelist`
- `/airdrops/nft-gtd`
- `/airdrops/free-mint`
- `/airdrops/other-web3`
- `/airdrops/{category}/{campaign-slug}`
- `/earn`
- `/wallet`
- `/withdraw`
- `/leaderboard`
- `/faq`
- `/setup`

### Admin routes
- `/admin`
- `/admin/campaign/{campaign-id}`
- `/admin/submissions`
- `/admin/withdrawals`

## Deploy to GitHub Pages — no workflow
1. Create a Supabase project.
2. Supabase → SQL Editor → run `supabase_schema.sql` once.
3. Create a normal user through the website.
4. Supabase → Authentication → Users → copy that user's UUID.
5. Run:
   `insert into public.admin_users(user_id) values ('YOUR-UUID');`
6. Upload every file in this folder to the repository root on the `main` branch.
7. GitHub → Settings → Pages → Deploy from branch → `main` → `/ (root)` → Save.
8. Open the published site and go to `/setup`.
9. Paste the Supabase project URL and the public anon key.

## Important
- NEVER put the Supabase service-role key in the website.
- Demo campaign cards are included so the public UI is not blank before Supabase setup.
- Real users, rewards, proofs and withdrawals use Supabase.
- Admin reward approval uses an atomic database function.
- Withdrawal balance is locked atomically when requested.
- Minimum withdrawal is $1.00.
- Proof screenshots use the `proofs` Storage bucket.
- Normal campaign/task changes happen from the Admin panel; source code does not need editing.
- The included `404.html` restores clean SPA URLs on GitHub Pages.

## Content you enter later
From Admin:
Campaign → category → title → description → slug → reward/tasks → external URL → publish.
Then share the generated clean campaign URL directly.
