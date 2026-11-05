# DROP ZONE Telegram Airdrop Bot

This bot is implemented as a Supabase Edge Function (Deno) so it does not need a permanently running VPS.

## Current MVP features
- Telegram /start registration and referral links
- Mission list from Supabase
- Proof submission by text or URL
- Admin review commands: /admin_pending and /approve <submission_uuid>
- Points and leaderboard
- Private database tables protected by RLS

## 1. Supabase
1. Open the existing Supabase project used by the AIRDROPX / US DROP ZONE website.
2. Run `supabase/migrations/202611050001_telegram_bot.sql` in SQL Editor.
3. Deploy the Edge Function in `supabase/functions/telegram-bot`.

## 2. Telegram
1. Create a bot with @BotFather and copy its token.
2. Note the bot username (without @).
3. Generate a random webhook secret (letters, numbers, underscore, hyphen; 32+ characters).
4. Set Edge Function secrets:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `TELEGRAM_BOT_USERNAME`
   - `TELEGRAM_ADMIN_IDS` (comma-separated numeric Telegram user IDs)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side secret only; never put in GitHub source or client code)

## 3. Deploy
Install Supabase CLI, log in, link the project, then run:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... TELEGRAM_BOT_USERNAME=... TELEGRAM_ADMIN_IDS=...
supabase functions deploy telegram-bot --no-verify-jwt
```

Set the Telegram webhook after deployment:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## 4. Add a test mission
Run in Supabase SQL Editor:

```sql
insert into public.bot_missions(title, description, category, action_url, reward_points, status)
values ('Welcome Mission', 'Visit the project page and submit a public profile or campaign link as proof.', 'Getting Started', 'https://example.com', 25, 'active');
```

## Important
- Never share the bot token or Supabase service-role key in chat or commit them to GitHub.
- This MVP uses manual proof review. Social and on-chain verification, referral rewards, admin web panel, and automated anti-abuse checks are planned next.
- Points are internal reputation/reward units until a payout policy is configured. Do not promise cash or tokens without funding and clear rules.
