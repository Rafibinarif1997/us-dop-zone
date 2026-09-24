# AIRDROPX

A complete static React-style SPA without a build step, backed by Supabase.

## Deploy without GitHub Actions / workflow

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase_schema.sql` once.
4. Create your first account on the site.
5. Copy that user's Auth UUID from Supabase Authentication and insert it into `admin_users`:
   `insert into public.admin_users(user_id) values('YOUR-UUID');`
6. Open `/setup` on your deployed site and enter the Supabase project URL + anon public key.
7. Upload the repository files to the GitHub `main` branch.
8. In GitHub: Settings → Pages → Deploy from a branch → `main` → `/root` → Save.
9. No GitHub Actions workflow is required.
10. The included `404.html` preserves clean SPA routes on GitHub Pages.

## Important

- Use only the Supabase anon public key in the frontend.
- NEVER put a Supabase service-role key in the website.
- The database RLS + RPC functions enforce reward approval and withdrawal logic.
- Campaigns/tasks are created from `/admin` after the admin user is added.
- Individual campaign URLs are clean and shareable:
  `/airdrops/{category}/{slug}`

## First data entry

After setup, the only recurring work should be content:
- campaign
- category
- task
- reward
- external URL
- proof requirement

The core application code does not need to be edited for normal campaign updates.

### Task management
Use `/admin`, then the **Tasks** button beside a campaign to create/edit its individual reward tasks.

### Proof screenshots
The SQL creates a `proofs` Storage bucket and RLS rules. Users can upload screenshots from the task submission modal.

### GitHub Pages clean URLs
The included `404.html` is the SPA fallback. GitHub Pages serves `index.html` for the fallback while the browser URL remains the requested clean route.
