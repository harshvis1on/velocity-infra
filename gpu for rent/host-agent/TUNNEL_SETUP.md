# Named Cloudflare Tunnel Setup (Persistent DNS)

## Why Named Tunnels?
Quick tunnels (`cloudflared tunnel --url`) generate random URLs that change on restart.
Named tunnels provide persistent, DNS-backed URLs like `{instance}.gpu.velocityinfra.in`.

## Prerequisites
1. Cloudflare account with a domain (e.g., `velocityinfra.in`)
2. `cloudflared` installed on the host machine
3. Domain added to Cloudflare DNS

## One-Time Setup (per host machine)

### 1. Authenticate cloudflared
```bash
cloudflared tunnel login
```
This opens a browser for Cloudflare authentication and saves credentials to `~/.cloudflared/cert.pem`.

### 2. Create a named tunnel for this machine
```bash
cloudflared tunnel create velocity-{MACHINE_ID_PREFIX}
```
This creates a tunnel and saves credentials to `~/.cloudflared/{TUNNEL_ID}.json`.

### 3. Configure DNS
```bash
cloudflared tunnel route dns velocity-{MACHINE_ID_PREFIX} *.gpu.velocityinfra.in
```

### 4. Set environment variables
```bash
export VELOCITY_TUNNEL_NAME=velocity-{MACHINE_ID_PREFIX}
export VELOCITY_TUNNEL_DOMAIN=gpu.velocityinfra.in
```

## How It Works
When `VELOCITY_TUNNEL_NAME` is set, the agent uses named tunnels instead of quick tunnels.
Each instance gets a subdomain: `{instance_id_prefix}.gpu.velocityinfra.in`

The agent creates a `config.yml` for cloudflared with ingress rules mapping
each instance's subdomain to its local port.

## Fallback
If `VELOCITY_TUNNEL_NAME` is not set, the agent falls back to quick tunnels (random URLs).
