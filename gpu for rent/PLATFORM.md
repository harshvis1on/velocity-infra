# Velocity Infra — Platform Architecture & Capabilities

> India's sovereign decentralized GPU cloud. Rent H100s, A100s, and RTX GPUs in 90 seconds.
> INR payments via UPI. 18% GST input tax credit. DPDP compliant data localization.

---

## What We Are

Velocity Infra is a **peer-to-peer GPU marketplace** modeled after Vast.ai, purpose-built for the Indian market. Hosts list their idle GPUs (from datacenters, workstations, or gaming rigs) and renters deploy AI workloads on them — all settled in INR with native UPI support and GST compliance.

The platform has three deployment modes:

| Mode | What It Does | Best For |
|------|-------------|----------|
| **GPU Cloud** | On-demand SSH/Jupyter instances with full root access | Training, fine-tuning, experimentation |
| **Serverless** | Auto-scaling model endpoints, pay-per-request | Production inference APIs |
| **Clusters** | Multi-node GPU clusters with InfiniBand | Large-scale LLM training |

---

## Platform Layers

```
┌─────────────────────────────────────────────────────┐
│                    RENTERS                           │
│  Web Console · CLI (velocity) · Python SDK          │
├─────────────────────────────────────────────────────┤
│                   MARKETPLACE                        │
│  Offers → Rental Contracts → Instances              │
│  On-Demand · Reserved (discounted) · Spot (bid)     │
├─────────────────────────────────────────────────────┤
│                BILLING ENGINE                        │
│  Per-GPU/per-minute · Storage billing · GST split   │
│  Razorpay (UPI/Cards) · Wallet system · Auto-deduct │
├─────────────────────────────────────────────────────┤
│              VERIFICATION & TRUST                    │
│  3-tier: Community → Verified → Enterprise          │
│  Auto-promotion via reliability, self-test, uptime  │
├─────────────────────────────────────────────────────┤
│                 HOST AGENT                           │
│  Python daemon · Docker orchestration · GPU slicing │
│  Heartbeat · Abuse detection · Maintenance mode     │
├─────────────────────────────────────────────────────┤
│                  DATABASE                            │
│  Supabase (PostgreSQL) · RLS · Realtime · pg_cron   │
└─────────────────────────────────────────────────────┘
```

---

## For Renters

### Deploy via Web Console

1. Browse the **GPU Marketplace** — filter by GPU model, max price, verification tier
2. Choose a rental type:
   - **On-Demand** — pay the listed rate, no commitment
   - **Reserved** — commit to a term, get up to 40% discount
   - **Interruptible (Spot)** — bid your own price, can be preempted
3. Select GPU count (respects host's `min_gpu` slicing — e.g., rent 2 of 8 GPUs)
4. Pick a Docker template (PyTorch, vLLM, ComfyUI, etc.) or bring your own image
5. Instance is live in ~90 seconds with SSH + Jupyter access

### Deploy via CLI

```bash
# Install
npm install -g velocity-infra-cli

# Authenticate
velocity login --api-key YOUR_KEY

# Search marketplace
velocity search-offers --gpu "RTX 4090" --max-price 50

# Deploy an instance from an offer
velocity create-instance --offer OFFER_ID --template pytorch --gpu-count 2

# List your instances
velocity list

# SSH into running instance
velocity ssh INSTANCE_ID

# Manage lifecycle
velocity stop INSTANCE_ID
velocity destroy INSTANCE_ID
```

### Deploy via Python SDK

```python
from velocity import VelocityClient

client = VelocityClient(api_key="your-api-key")

# Serverless inference
result = client.generate(
    endpoint_id="your-endpoint-id",
    payload={"prompt": "Hello, world!", "max_tokens": 100}
)
```

### Billing

- **Per-GPU, per-minute** billing — no rounding up to the hour
- **Storage billed separately** at ₹/GB/month (even on stopped instances)
- **Wallet system** — pre-fund via Razorpay (UPI, cards, net banking)
- **Auto-deduction** every minute from wallet; instance auto-stops at zero balance
- **GST compliant** — 18% input tax credit on all compute spend
- **Revenue split**: 85% to host, 15% platform fee

---

## For Hosts

### Listing Flow

1. **Register & complete KYC** — phone OTP + PAN verification
2. **Add your machine** — specify GPU model, count, VRAM, RAM, CPU, storage, location
3. **Create an offer** — set per-GPU hourly rate, storage price, min GPU slice, offer end date
4. **Optional**: enable interruptible (spot) pricing with a minimum bid floor
5. **Optional**: offer a reserved discount factor (e.g., 40% off for committed terms)
6. Machine goes live on the marketplace once the offer is published

### GPU Slicing

Hosts can set `min_gpu` (must be a power of 2: 1, 2, 4, 8) to allow multiple renters on one machine. Example: an 8-GPU machine with `min_gpu=2` can serve up to 4 concurrent renters, each getting exclusive access to their allocated GPU indices.

### Verification Tiers

| Tier | Badge | Requirements |
|------|-------|-------------|
| **Community** | Yellow | Default for new machines |
| **Verified** | Blue | Reliability ≥ 85%, self-test passed, 100+ consecutive heartbeats, GPU temp < 90°C, CUDA ≥ 12.0 |
| **Enterprise** | Green | Datacenter application approved (Tier 3/4, ISO 27001, SOC 2, 99.9% SLA) |

Machines are **automatically promoted/demoted** based on continuous monitoring. The verification system tracks:
- `reliability_score` (rolling average)
- `consecutive_heartbeats` (10-second intervals)
- `self_test_passed` (automated hardware validation)
- `gpu_temp`, `cpu_usage`, `ram_usage`, `disk_usage`
- `dlperf_score` (deep learning performance benchmark, TFLOPS)
- `inet_down_mbps`, `inet_up_mbps`, `pcie_bandwidth_gbps`

### Host Agent

The Python host agent (`host-agent/agent.py`) runs as a daemon on the host machine:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the agent
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=eyJ... \
MACHINE_ID=your-machine-uuid \
python agent.py

# Run self-test only
python agent.py --self-test
```

**What the agent does:**
- Polls Supabase for new instance creation/stop/destroy jobs
- Launches Docker containers with GPU device pinning (`--gpus "device=0,1"`)
- Applies security hardening: `no-new-privileges`, capability drops, read-only rootfs, tmpfs mounts, network isolation
- Blocks abuse: SMTP, BitTorrent, mining stratum ports via iptables
- Detects crypto mining (process names, pool patterns, nvidia-smi compute apps)
- Reports heartbeat + live metrics every 10 seconds
- Supports `localtunnel` for reverse SSH tunneling
- Checks maintenance windows and warns active instances
- Runs comprehensive self-test (CUDA, network, PCIe bandwidth, DLPerf)

### Maintenance Windows

Hosts can schedule maintenance windows via the dashboard or CLI:

```bash
velocity schedule-maint --machine MACHINE_ID --start "2026-05-01T02:00:00" --duration 4
velocity cancel-maint --machine MACHINE_ID
```

Active instances receive a warning when a maintenance window is approaching.

### Host CLI Commands

```bash
velocity show-machines                    # List all your machines
velocity list-machine                     # Create offer & list on marketplace
velocity unlist-machine --machine ID      # Take machine offline
velocity set-min-bid --offer ID --price 15  # Set spot pricing floor
velocity self-test --machine ID           # View self-test results
velocity cleanup-machine --machine ID     # Reconcile GPU allocation
velocity show-earnings                    # Wallet + payout history
```

---

## Serverless Inference

Deploy ML models as auto-scaling API endpoints:

1. **Create an endpoint** — name, scaling parameters (min/max workers, scale-up/down thresholds)
2. **Create worker groups** — attach Docker templates, GPU requirements, launch arguments
3. **Send requests** — POST to the endpoint router, which load-balances across workers
4. **Auto-scaling** — cron-based scaler adjusts worker count based on utilization
5. **Pay per request** — no idle costs when scaled to zero

### Architecture

```
Client → POST /api/serverless/endpoints/{id}/route
       → Router picks worker with lowest queue_time
       → Returns worker_url + auth_data
       → Client calls worker_url/generate directly

Autoscaler (cron) → Checks utilization → Scales workers up/down
```

### PyWorker Sidecar

Each serverless worker runs a PyWorker sidecar (FastAPI) that:
- Handles `/generate` requests
- Reports metrics back to the platform (`current_load`, `queue_time`)
- Runs inside the same Docker container network

---

## Database Schema

### Core Tables (schema-v2)

| Table | Purpose |
|-------|---------|
| `users` | Profiles, roles (host/renter/admin), KYC status, wallet balance, GSTIN |
| `ssh_keys` | User SSH public keys for instance access |
| `machines` | Host GPU inventory — model, count, VRAM, RAM, CPU, storage, location, tier, pricing, health metrics |
| `templates` | Docker template registry — image, launch mode, env vars, category |
| `instances` | Active GPU sessions — lifecycle (creating→running→stopped→destroyed), billing, SSH access |
| `transactions` | Wallet ledger — deposits, charges, payouts, GST breakdowns |

### Hosting V3 Tables (hosting-v3-schema)

| Table | Purpose |
|-------|---------|
| `offers` | Per-machine pricing listings — per-GPU rate, storage rate, min GPU slice, end date, spot floor, reserved discount |
| `rental_contracts` | Immutable contract terms — locked price, GPU indices, rental type, duration |
| `maintenance_windows` | Scheduled downtime windows per machine |

### Serverless Tables (serverless-schema)

| Table | Purpose |
|-------|---------|
| `endpoints` | Serverless endpoint configs — scaling rules, API key |
| `workergroups` | Worker templates per endpoint — GPU requirements, launch args |
| `workers` | Running worker instances — status, metrics, machine assignment |
| `endpoint_requests` | Request log — routing decisions, latency tracking |

### Security Tables (security-migration)

| Table | Purpose |
|-------|---------|
| `abuse_logs` | Network violation and mining detection logs |
| `rate_limits` | API rate limiting tracking |
| `datacenter_applications` | Enterprise tier applications |

### Automated Jobs (pg_cron)

| Job | Schedule | Function |
|-----|----------|----------|
| `process_billing` | Every minute | Calculates per-GPU charges, deducts from renter wallet, credits host wallet |
| `auto_expire_offers` | Every minute | Expires offers past their end date |
| `auto_end_contracts` | Every minute | Terminates contracts past their rental end date, frees GPU allocation |

---

## Docker Templates

Pre-configured environments available for 1-click deployment:

| Template | Image | Launch Mode | Category |
|----------|-------|-------------|----------|
| PyTorch 2.2 | `runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04` | Jupyter | ML |
| vLLM (OpenAI Compatible) | vLLM image | Entrypoint | ML |
| Text Generation Inference | TGI image | Entrypoint | ML |
| ComfyUI | ComfyUI image | Jupyter | Diffusion |
| Stable Diffusion WebUI (A1111) | SD WebUI image | Jupyter | Diffusion |
| SD WebUI Forge | Forge image | Jupyter | Diffusion |
| Fooocus | Fooocus image | Jupyter | Diffusion |
| Axolotl Fine-Tuning | Axolotl image | Jupyter | ML |
| Open-Sora Video | Open-Sora image | Jupyter | Diffusion |
| NVIDIA CUDA Base | `nvidia/cuda:12.2.2-devel-ubuntu22.04` | SSH | Base |
| Ubuntu 22.04 | `nvidia/cuda:12.2.2-devel-ubuntu22.04` | SSH | Base |

Templates are defined as JSON in `/templates/*/template.json` and synced to the database via `templates/sync.py`.

---

## Security & Compliance

### Network Security

- **Security headers**: HSTS, X-Frame-Options (DENY), CSP, COOP, CORP, X-Content-Type-Options
- **Container hardening**: `no-new-privileges`, capability drops (`ALL`), read-only rootfs, tmpfs for `/tmp` and `/run`
- **Network isolation**: dedicated Docker network (`velocity-net`), resource limits (CPU, memory, PIDs)
- **Port blocking**: SMTP (25, 465, 587), BitTorrent ranges, mining stratum ports blocked via iptables

### Abuse Detection

- **Crypto mining detection**: scans process names, pool connection patterns, nvidia-smi compute processes
- **Network monitoring**: logs violations to `abuse_logs` table
- **Auto-ban system**: persistent abusers are flagged and banned

### Authentication & Authorization

- **Supabase Auth**: email/password, magic link, Google OAuth, GitHub OAuth
- **Row Level Security (RLS)**: every table has policies ensuring users only access their own data
- **Middleware**: session management, KYC gating, banned user checks, role-based access control
- **API keys**: per-user keys for CLI and SDK authentication

### KYC & Compliance

- **Phone verification**: OTP via Twilio
- **PAN verification**: identity validation for hosts
- **GST compliance**: 18% GST split (IGST/CGST/SGST), input tax credit support
- **DPDP compliance**: 100% data stays within India, Digital Personal Data Protection Act compliant

---

## API Routes Reference

### Renter APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/console/rent` | Create rental contract from offer |
| POST | `/api/billing/create-order` | Create Razorpay payment order |
| POST | `/api/billing/webhook` | Razorpay payment confirmation |

### Host APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/host/offers` | List host's offers |
| POST | `/api/host/offers` | Create new offer |
| GET | `/api/host/offers/:id` | Get single offer |
| PATCH | `/api/host/offers/:id` | Update offer |
| DELETE | `/api/host/offers/:id` | Unlist offer |
| GET | `/api/host/machines/:id/maintenance` | List maintenance windows |
| POST | `/api/host/machines/:id/maintenance` | Schedule maintenance |
| DELETE | `/api/host/machines/:id/maintenance` | Cancel maintenance |
| POST | `/api/host/machines/:id/self-test` | Get self-test results |

### Serverless APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/serverless/endpoints` | List/create endpoints |
| GET/PATCH/DELETE | `/api/serverless/endpoints/:id` | Manage endpoint |
| POST | `/api/serverless/endpoints/:id/route` | Route inference request |
| GET/POST | `/api/serverless/endpoints/:id/workergroups` | Manage worker groups |
| POST | `/api/serverless/autoscale` | Trigger autoscaler |
| POST | `/api/serverless/workers/:id/metrics` | Push worker metrics |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes + Server Actions |
| Database | Supabase (PostgreSQL), RLS, Realtime, pg_cron |
| Auth | Supabase Auth (email, OAuth, magic link) |
| Payments | Razorpay (UPI, cards, net banking) |
| Host Agent | Python, Docker, nvidia-docker, localtunnel |
| CLI | Node.js, Commander.js |
| SDK | Python (velocity-sdk) |
| Validation | Zod schemas |
| Container Runtime | Docker with NVIDIA Container Toolkit |

---

## File Structure

```
gpu-for-rent/
├── web/                          # Next.js 14 web application
│   ├── src/app/
│   │   ├── page.tsx              # Landing page
│   │   ├── login/                # Auth pages
│   │   ├── signup/
│   │   ├── onboarding/           # KYC flow
│   │   ├── console/              # Renter dashboard + marketplace
│   │   │   ├── serverless/       # Serverless endpoints UI
│   │   │   └── actions.ts        # Deploy/stop/destroy actions
│   │   ├── host/
│   │   │   ├── page.tsx          # Host landing page
│   │   │   ├── dashboard/        # Host machine management
│   │   │   └── datacenter-apply/ # Enterprise tier application
│   │   ├── billing/              # Wallet & transaction history
│   │   ├── settings/             # Profile, API keys, SSH keys
│   │   ├── pricing/              # Public pricing page
│   │   ├── api/                  # API routes
│   │   │   ├── console/rent/     # Rental creation
│   │   │   ├── host/             # Host offer/machine management
│   │   │   ├── billing/          # Razorpay integration
│   │   │   └── serverless/       # Serverless engine
│   │   └── components/           # Shared UI components
│   └── src/lib/validations.ts    # Zod schemas
├── host-agent/
│   ├── agent.py                  # Host daemon (Docker orchestration)
│   ├── requirements.txt
│   └── README.md
├── cli/
│   └── index.js                  # CLI tool (velocity command)
├── sdk/
│   └── velocity/                 # Python SDK
│       ├── __init__.py
│       └── client.py
├── templates/                    # Docker template definitions
│   ├── pytorch/template.json
│   ├── vllm/template.json
│   ├── comfyui/template.json
│   └── sync.py                   # Template → DB sync script
├── schema-v2.sql                 # Core database schema
├── hosting-v3-schema.sql         # Offers/contracts migration
├── serverless-schema.sql         # Serverless tables
├── billing-cron.sql              # Per-minute billing engine
├── verification-system.sql       # Machine verification lifecycle
├── security-migration.sql        # KYC, abuse detection tables
└── PLATFORM.md                   # This file
```

---

## Deployment Checklist

1. **Supabase**: Run all SQL migrations in order: `schema-v2.sql` → `serverless-schema.sql` → `hosting-v3-schema.sql` → `verification-system.sql` → `security-migration.sql` → `billing-cron.sql`
2. **Environment**: Set `.env.local` with Supabase URL/keys, Razorpay keys, Twilio credentials
3. **Templates**: Run `python templates/sync.py` to populate the template registry
4. **Web**: `cd web && npm install && npm run build && npm start`
5. **Host Agent**: Distribute `host-agent/` to GPU providers; they run `python agent.py`
6. **CLI**: `npm install -g` from `cli/` directory or publish to npm
7. **Cron**: Verify `pg_cron` jobs are running (billing, offer expiry, contract termination)

---

## Revenue Model

- **Platform fee**: 15% of all compute charges
- **Host payout**: 85% credited to host wallet
- **GST**: 18% collected on deposits, available as input tax credit to renters
- **No withdrawal fees** (planned: bank transfer via Razorpay Route)

---

*Last updated: April 2026*
