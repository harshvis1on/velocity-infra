# Velocity Host Agent

Python daemon that runs on provider machines to turn them into GPU nodes on the Velocity decentralized compute marketplace.

## How it works

1. **Provider installs agent** on an Ubuntu machine with Docker + NVIDIA drivers.
2. **Heartbeat loop** pings the backend every 30s with machine status, GPU temps, and health.
3. **Renter deploys** from the web console — creates an `instances` row with `status = 'creating'`.
4. **Agent picks up job** by polling the `instances` table for rows matching its `machine_id`.
5. **Job signature verification** — every job payload is verified via HMAC-SHA256 (`VELOCITY_JOB_SECRET`). Unsigned or unverified jobs are rejected.
6. **Docker orchestration** — launches containers with GPU passthrough, resource limits (CPU, memory, network), SSH, and optional Jupyter.
7. **Cloudflare Tunnel** — for hosts behind NAT, the agent manages a named tunnel with per-instance ingress rules.
8. **Security monitoring** — mining detection, firewall enforcement, container resource limits, and abuse prevention.
9. **Graceful shutdown** — on SIGTERM/SIGINT, the agent stops all containers, removes tunnels, and sets machine status to `offline`.

## Prerequisites

- Ubuntu 20.04 or 22.04
- NVIDIA Drivers 525+
- Docker Engine 24+ with NVIDIA Container Toolkit (`nvidia-docker2`)
- Python 3.8+ with `pip install -r requirements.txt`
- Stable internet (100+ Mbps recommended)

## Required environment variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `MACHINE_ID` | UUID assigned when machine is registered via the dashboard |
| `VELOCITY_JOB_SECRET` | Shared HMAC secret for job signature verification (**required** — agent rejects all jobs without it) |

## Optional environment variables

| Variable | Default | Description |
|---|---|---|
| `SUPABASE_ANON_KEY` | built-in | Supabase anonymous key (public) |
| `VELOCITY_NET_LIMIT_MBPS` | `500` | Network bandwidth cap per container |
| `TUNNEL_NAME` | none | Cloudflare named tunnel for NAT traversal |
| `TUNNEL_CERT_PATH` | none | Path to Cloudflare tunnel credentials |

## Running

```bash
# Register your machine first via the dashboard or API, then:
SUPABASE_URL=https://xxx.supabase.co \
MACHINE_ID=your-uuid \
VELOCITY_JOB_SECRET=your-shared-secret \
python agent.py --api-key vi_live_xxxxx

# Self-test (validates GPU, Docker, network)
python agent.py --self-test

# Register a new machine
python agent.py --register
```

## XP and tier rewards

Providers earn XP automatically:
- **+10 XP** per hour of successfully hosted compute
- **+50 XP** when a machine passes self-test verification
- **+200 XP** for 30-day perfect uptime streaks
- **+25 XP** per completed referral

Higher tiers reduce the platform fee from 15% (Bronze) to 5% (Diamond).

## Database tables used

- `machines` — machine registration, status, heartbeat
- `instances` — job lifecycle (creating → running → terminated)
- `rental_contracts` — GPU allocation, pricing, contract terms
- `offers` — marketplace listings with pricing
- `users` — provider XP, tier, wallet balance
