# Velocity

**The cheapest GPUs for AI. Period.**

Velocity is a GPU marketplace where AI developers rent A100s, H100s, and RTX 4090s at up to 80% off cloud pricing. Providers list idle hardware and earn revenue automatically. Billed per minute, no lock-in, no credit card required to start.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- **Payments**: Razorpay (INR — UPI, cards, net banking)
- **Host Agent**: Python (hardware detection, Docker management, Cloudflare Tunnels)
- **CLI**: Node.js (`commander`, `axios`)
- **SDK**: Python (`requests`, `httpx`)
- **Deployment**: Vercel

## Project Structure

```
web/           Next.js frontend + API routes
cli/           velocity-infra CLI tool
sdk/           Python SDK
host-agent/    Provider agent (Python)
templates/     Pre-built GPU instance templates (JSON)
migrations/    Supabase SQL migrations
supabase/      Supabase project config
pyworker/      Serverless inference worker
legacy/        Archived earlier iterations
```

## Getting Started

```bash
git clone <repo-url>
cd "gpu for rent/web"
npm install
cp .env.local.example .env.local   # fill in Supabase + Razorpay keys
npm run dev                         # http://localhost:3000
```

## Key Features

- **Renter experience**: Browse GPUs, deploy in seconds, SSH/Jupyter access, per-minute billing
- **Provider experience**: List hardware, set pricing, earn XP, tier up (Bronze → Diamond) for lower fees
- **Referral system**: Invite friends, both get free GPU hours
- **Templates**: PyTorch, vLLM, TGI, ComfyUI, Stable Diffusion, and more
- **Security**: Isolated containers, TLS 1.3, signed job payloads, CSRF protection

## License

Proprietary. All rights reserved.
