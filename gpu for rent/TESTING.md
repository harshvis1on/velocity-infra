# Velocity Infra — End-to-End Smoke Test Guide

This document walks through the **full renter-to-host loop** to validate the MVP before taking real money.

---

## Prerequisites

### 1. Supabase Database

1. Open the Supabase Dashboard → **SQL Editor** → New query
2. Paste the entire contents of `migrations/001-full-migration.sql`
3. Click **Run** — this creates all tables, RLS policies, cron jobs, and functions
4. Verify: run `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;` — you should see ~18 tables

### 2. Environment Variables (Web)

Copy `web/.env.local.example` to `web/.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (keep secret!) |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same page |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Webhooks → Create → Secret |
| `TWILIO_*` | Twilio Console (optional for smoke test) |

### 3. Razorpay Webhook

1. Razorpay Dashboard → Webhooks → Create
2. URL: `https://your-deployment.vercel.app/api/billing/webhook`
3. Events: `payment.captured`
4. Copy the **secret** into `RAZORPAY_WEBHOOK_SECRET`

### 4. Host Machine (Linux + NVIDIA GPU)

Minimum requirements:

- Ubuntu 20.04+ or similar Linux
- NVIDIA GPU (any — RTX 3060 minimum)
- NVIDIA driver 525+ with CUDA 12.0+
- Docker Engine 24+ with `nvidia-container-toolkit`
- Python 3.10+ with pip
- Internet connection (50+ Mbps down, 25+ up)
- `cloudflared` installed:
  ```bash
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared
  ```

### 5. Start the Web App

```bash
cd web
npm install
npm run dev
```

Verify it loads at `http://localhost:3000`.

---

## The Smoke Test (Step by Step)

### Step 1: Create Host Account

1. Open `http://localhost:3000` (or Vercel deployment)
2. Sign up with email/password or OAuth
3. In Supabase Dashboard → Table Editor → `users`, set `role` to `host` for this user

### Step 2: List a Machine

1. Log in as host → go to `/host/dashboard`
2. Click **List Machine** and fill in:
   - GPU Model: e.g. `RTX 3060`
   - GPU Count: `1`
   - VRAM: `12`
   - vCPU: `8`
   - RAM: `16`
   - Storage: `100`
   - Price: `35` (₹35/hr)
   - Offer End Date: 30 days from now
3. Submit — this creates a `machine` + `offer` row
4. Note the **Machine ID** from Supabase Dashboard → `machines` table

### Step 3: Start the Host Agent

On the GPU host machine:

```bash
cd host-agent
pip install -r requirements.txt

export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_KEY="your-service-role-key"
export MACHINE_ID="machine-uuid-from-step-2"

# Run self-test first
python agent.py --self-test

# If self-test passes, start the agent
python agent.py
```

Wait for heartbeats — check the `machines` table for `last_heartbeat` updating and `status` = `available`.

### Step 4: Create Renter Account

1. Open a different browser / incognito window
2. Sign up with a different email
3. Complete KYC: phone OTP verification (or skip by setting `kyc_status` to `verified` in Supabase)

### Step 5: Add Funds

1. Log in as renter → go to `/console`
2. Click **Add Funds (UPI)**
3. Enter `500` (₹500)
4. Complete Razorpay test payment (use test card: `4111 1111 1111 1111`, any future date, any CVV)
5. Wait 3-5 seconds for the webhook to fire

**Verify:**
- Check `users` table: `wallet_balance_inr` should show `500.00`
- Check `transactions` table: should have a `deposit` row with `razorpay_payment_id`

### Step 6: Deploy an Instance

1. In the renter console, browse the marketplace
2. You should see your host's GPU listed
3. Select it → choose PyTorch template → 1 GPU → SSH mode
4. Click **Deploy**

**Verify in the database:**
- `rental_contracts`: new row with `status = 'active'`
- `instances`: new row with `status = 'creating'`
- `machines`: `gpu_allocated` incremented

### Step 7: Watch the Host Agent

The agent should pick up the job within 10 seconds:

```
[NEW JOB] Instance abc123 – launching container…
Pulling image runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04 …
Container started: velocity-pod-abc123 (abc123def456)
Setting up SSH server in container velocity-pod-abc123...
SSH server started in velocity-pod-abc123
Starting cloudflared tunnel for port 22000...
Cloudflare tunnel established: https://some-random-words.trycloudflare.com
Instance abc123 is running.
```

**Verify:**
- `instances` table: `status = 'running'`, `tunnel_url` populated, `container_id` set

### Step 8: Connect to the Instance

1. In the renter console, click **Connect** on the running instance
2. Copy the SSH command shown
3. From a terminal:
   ```bash
   ssh root@some-random-words.trycloudflare.com -p 443
   ```
   Or use the SSH password if no key was provided.
4. Inside the container:
   ```bash
   nvidia-smi          # Should show your GPU
   python -c "import torch; print(torch.cuda.is_available())"   # Should print True
   ```

### Step 9: Verify Billing

Wait 1-2 minutes for the billing cron to fire.

**Verify:**
- `users` table (renter): `wallet_balance_inr` decreased from `500`
- `instances` table: `total_cost_inr` > 0, `host_payout_inr` > 0
- `transactions` table: `auto_deduct` rows appearing
- `users` table (host): `wallet_balance_inr` increased (85% of charge)

### Step 10: Destroy the Instance

1. In the renter console, click **Destroy** on the instance
2. Wait for the agent to clean up:
   ```
   [DESTROY JOB] Instance abc123 – destroying container…
   Container abc123def456 removed.
   Volume velocity-data-abc123 removed.
   ```

**Verify:**
- `instances`: `status = 'destroyed'`, `container_id = null`
- `rental_contracts`: `status = 'terminated'`
- `machines`: `gpu_allocated` back to `0`

### Step 11: Auto-Stop on Zero Balance (Optional)

1. Deploy another instance
2. In Supabase, manually set the renter's `wallet_balance_inr` to `0.50`
3. Wait for the billing cron (1 minute)
4. Instance should auto-stop: `status = 'stopped'`

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Agent not picking up jobs | `machines.id` matches `MACHINE_ID` env var |
| Instance stuck in `creating` | Agent logs — check Docker errors |
| Tunnel URL empty | `cloudflared` not installed on host |
| SSH connection refused | SSH server setup failed — check if image supports `apt` |
| Wallet not credited | Webhook secret mismatch — check `RAZORPAY_WEBHOOK_SECRET` |
| Billing not deducting | pg_cron not running — check `SELECT * FROM cron.job;` |
| Deploy returns 404 | Schema migrations not applied — run `001-full-migration.sql` |
| "Offer not found" | Offer status is not `active` or has expired |

---

## Quick Seed Data (Alternative to Manual Setup)

If you want to skip manual host setup, insert directly into Supabase:

```sql
-- Insert a test host user (replace AUTH_USER_UUID with real auth.users ID)
INSERT INTO public.users (id, email, role, kyc_status, wallet_balance_inr)
VALUES ('AUTH_USER_UUID', 'host@test.com', 'host', 'verified', 0);

-- Insert a test machine
INSERT INTO public.machines (
  id, host_id, gpu_model, gpu_count, vram_gb, vcpu_count, ram_gb, storage_gb,
  price_per_hour_inr, status, location
) VALUES (
  'MACHINE_UUID', 'AUTH_USER_UUID', 'RTX 3060', 1, 12, 8, 16, 100,
  35.00, 'available', 'India'
);

-- Insert an offer for the machine
INSERT INTO public.offers (
  machine_id, host_id, price_per_gpu_hr_inr,
  storage_price_per_gb_month_inr, min_gpu, offer_end_date
) VALUES (
  'MACHINE_UUID', 'AUTH_USER_UUID', 35.00,
  4.50, 1, now() + interval '30 days'
);
```

---

## Success Criteria

The smoke test passes when ALL of these work in sequence:

- [ ] Renter signs up
- [ ] Renter adds ₹500 via Razorpay (test mode)
- [ ] Wallet shows ₹500
- [ ] Marketplace shows the host's GPU
- [ ] Deploy creates instance → status goes `creating` → `loading` → `running`
- [ ] Renter SSHs into container via tunnel
- [ ] `nvidia-smi` shows GPU inside container
- [ ] Billing cron deducts after 1 minute
- [ ] Wallet balance decreases
- [ ] Renter destroys instance
- [ ] Machine GPUs freed, host wallet credited
