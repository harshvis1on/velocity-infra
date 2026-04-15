# Velocity Infra Host Agent

This is the Python daemon that runs on a Host's machine (e.g., an Indian VFX studio or gamer's PC) to turn it into a node on the Velocity Infra decentralized GPU cloud.

## How it works (The P2P Marketplace Model)

Unlike AWS or RunPod where the company owns the data centers, Velocity Infra acts as a marketplace (like Vast.ai). 

1. **Host Installs Agent:** A host runs this Python script on their Ubuntu machine (which must have Docker and Nvidia drivers installed).
2. **Heartbeat:** The agent constantly pings the central Supabase backend (`api.velocity.infra/machines`) to say "I am online, my IP is X, and my GPUs are idle."
3. **Renter Deploys:** A renter goes to the `/console` on the website, selects a template (e.g., PyTorch), and clicks "Deploy" on this host's machine.
4. **Agent Picks Up Job:** The agent polls the `rentals` table. It sees a new active rental assigned to its `machine_id`.
5. **Docker Orchestration:** The agent executes a subprocess command:
   ```bash
   docker run -d --gpus all -p <random_host_port>:22 -p <random_host_port+1>:8888 runpod/pytorch:latest
   ```
6. **Connection Handshake:** The agent updates the `rentals` table with the `container_id` and the `host_port`. 
7. **Renter Connects:** The website UI updates, showing the renter the exact SSH command and JupyterLab URL to connect directly to the host's machine (via the mapped port).

## Prerequisites for Hosts
- Ubuntu 20.04 or 22.04
- NVIDIA Drivers installed
- Docker Engine installed
- NVIDIA Container Toolkit installed (`nvidia-docker2`)
- A stable internet connection with port forwarding enabled (or a reverse proxy/tunnel like Cloudflare Tunnels/Ngrok if behind NAT).

## Running the MVP Agent
```bash
export SUPABASE_URL="https://dmzeaolugvuykaqgcbji.supabase.co"
export SUPABASE_KEY="<YOUR_SERVICE_ROLE_KEY>"
export MACHINE_ID="<YOUR_MACHINE_UUID_FROM_DASHBOARD>"

python3 agent.py
```
