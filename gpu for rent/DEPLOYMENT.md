# Velocity Infra — Deployment Guide

## Environment Variables

Copy `web/.env.local.example` to `web/.env.local` and fill in real values.

### Required

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same place (anon/public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same place (service_role key — keep secret!) |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same place |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` (safe to expose) |
| `RAZORPAY_WEBHOOK_SECRET` | See Razorpay Webhook Setup below |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` |

### Optional

| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` | Phone OTP verification |
| `TWILIO_AUTH_TOKEN` | Phone OTP verification |
| `TWILIO_PHONE_NUMBER` | Phone OTP sender number |

---

## Razorpay Webhook Setup

The billing system requires a Razorpay webhook to credit wallets when payments are captured.

### Steps

1. Go to **Razorpay Dashboard** → **Settings** → **Webhooks**
2. Click **+ Add New Webhook**
3. Configure:
   - **Webhook URL:** `https://yourdomain.com/api/billing/webhook`
   - **Secret:** Generate a strong secret (e.g., `openssl rand -hex 32`)
   - **Alert Email:** Your ops email
   - **Active Events:** Check only `payment.captured`
4. Click **Create Webhook**
5. Copy the webhook secret and set it as `RAZORPAY_WEBHOOK_SECRET` in your environment

### Verification

The webhook endpoint:
- Validates the `x-razorpay-signature` header using HMAC-SHA256
- Returns `503` if `RAZORPAY_WEBHOOK_SECRET` is not configured (fail-closed)
- Is idempotent — duplicate `payment.captured` events are safely ignored
- Is rate-limited to prevent abuse

### Testing

In Razorpay Test Mode:
1. Use test API keys (`rzp_test_*`)
2. Create a test payment via the Razorpay checkout on your site
3. Razorpay will send a test webhook to your URL
4. Check the `transactions` table for a new `deposit` row

---

## Database Migrations

Run migrations in order against your Supabase project:

```bash
# If using Supabase CLI (linked project)
supabase db query --linked < migrations/001-full-migration.sql
supabase db query --linked < migrations/002-api-keys.sql
supabase db query --linked < migrations/003-auto-topup.sql
supabase db query --linked < migrations/004-host-payouts.sql
supabase db query --linked < migrations/005-balance-alerts.sql
supabase db query --linked < migrations/006-named-tunnels.sql
supabase db query --linked < migrations/007-template-management.sql
supabase db query --linked < migrations/008-persistent-volumes.sql
supabase db query --linked < migrations/009-rls-fixes.sql
supabase db query --linked < migrations/010-self-test-request.sql
supabase db query --linked < billing-cron.sql
```

---

## Vercel Deployment

1. Connect your GitHub repo to Vercel
2. Set the root directory to `web`
3. Add all environment variables from above to Vercel's Environment Variables
4. Deploy

### Cron Jobs (Vercel)

Set up Vercel Cron or an external cron service to call:

| Endpoint | Schedule | Auth Header |
|---|---|---|
| `POST /api/billing/auto-topup` | Every 5 min | `Authorization: Bearer <CRON_SECRET>` |
| `POST /api/payouts/generate` | Weekly (Sunday) | `Authorization: Bearer <CRON_SECRET>` |

### Health Check

`GET /api/health` returns the status of all connected services. Returns `200` when healthy, `503` when degraded. It also warns if `CRON_SECRET` or `RAZORPAY_WEBHOOK_SECRET` are missing.

---

## Host Agent Distribution

The host agent is at `host-agent/agent.py`. Hosts install via:

```bash
curl -sSL https://get.velocityinfra.in/install.sh | sudo bash
```

To host this script, serve `host-agent/install.sh` and `host-agent/agent.py` from a public URL (GitHub raw, S3, or your domain).
