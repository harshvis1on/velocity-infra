# Velocity Infra: Core Infrastructure Plan

This document outlines the architecture and next steps for building the core infrastructure components of Velocity Infra.

## 1. Host Agent Packaging (Docker)

Currently, the Host Agent (`host-agent/agent.py`) is a raw Python script. To make onboarding seamless for hosts, it must be containerized.

### Architecture
- **Base Image:** `python:3.11-slim`
- **Dependencies:** `psutil`, `requests`, `docker` (CLI binary installed inside the container to communicate with the host's Docker daemon).
- **Execution:** The container must be run with `--privileged`, `--network host`, and a volume mount for the Docker socket (`-v /var/run/docker.sock:/var/run/docker.sock`). This allows the agent container to spawn sibling containers (the actual GPU instances) on the host.

### Host Onboarding Command
Hosts will run a single command to link their machine to Velocity Infra:
```bash
docker run -d --restart unless-stopped \
  --name velocity-agent \
  --privileged \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e SUPABASE_URL="https://dmzeaolugvuykaqgcbji.supabase.co" \
  -e SUPABASE_KEY="<SERVICE_ROLE_KEY>" \
  -e MACHINE_ID="<MACHINE_UUID>" \
  velocityinfra/host-agent:latest
```

## 2. Velocity CLI (`velocity-infra`)

A command-line interface for power users (Renters) to manage their GPU instances without using the web console.

### Architecture
- **Language:** Node.js (TypeScript) or Python (Click/Typer).
- **Distribution:** Published to npm (`npm install -g velocity-infra`) or PyPI (`pip install velocity-infra`).
- **Authentication:** Users generate API keys in the web console (`/settings`). The CLI stores the key locally in `~/.velocity/credentials`.

### Core Commands
- `velocity login --api-key <key>`: Authenticates the CLI.
- `velocity search --gpu 4090 --max-price 50`: Queries the Supabase REST API for available machines.
- `velocity deploy --machine <id> --template pytorch`: Calls the Supabase API to create an instance row (which triggers the host agent to pull and run the container).
- `velocity list`: Shows active pods and their status.
- `velocity ssh <instance-id>`: Automatically fetches the public IP and port from Supabase and initiates an SSH connection (`ssh root@<ip> -p <port>`).
- `velocity destroy <instance-id>`: Terminates the instance.

## 3. Docker Templates Registry

Currently, Docker templates (PyTorch, Stable Diffusion, Base Ubuntu) are hardcoded in the `schema-v2.sql` file. This needs to be decentralized and community-driven.

### Architecture
- **Repository:** Create a public GitHub repository: `github.com/velocity-infra/templates`.
- **Structure:** Each template gets its own folder containing a `Dockerfile` and a `template.json` file.
  ```json
  {
    "name": "pytorch-2.2",
    "label": "PyTorch 2.2",
    "description": "JupyterLab, PyTorch 2.2, CUDA 12.1",
    "launch_mode": "jupyter",
    "category": "ml"
  }
  ```
- **CI/CD Pipeline:** A GitHub Actions workflow triggers on merge to `main`. It builds the Docker image, pushes it to Docker Hub (`velocityinfra/pytorch-2.2:latest`), and uses the Supabase Management API to upsert the template metadata into the `public.templates` table.
- **Community Contributions:** Users can submit Pull Requests to add new templates (e.g., specific LLM training environments, rendering pipelines).

## 4. Advanced Hosting Concepts (Vast.ai Model)

To fully realize a decentralized marketplace, we must implement the following advanced hosting concepts into the backend and UI:

### A. Offers vs. Rental Contracts
- **Concept:** A Host creates an *Offer* (a listed machine with a price and an `offer_end_date`). When a Renter deploys, it creates a *Rental Contract* that locks in the price and the end date.
- **Implementation:** `public.machines` represents the Offer. `public.instances` represents the Rental Contract.
- **Rule:** A Host *cannot* unlist or modify a machine in a way that disrupts active `instances` until their `ended_at` or the original `offer_end_date` is reached.

### B. GPU Slicing (`min_gpu`)
- **Concept:** A host with an 8x RTX 4090 rig can allow users to rent 1, 2, 4, or all 8 GPUs.
- **Implementation:** The Renter CLI and Web Console must allow users to select the *number* of GPUs they want to rent from a specific machine. The backend must track available capacity (`available_gpus = machine.gpu_count - sum(active_instances.gpu_count)`).

### C. Volume Offers (Storage Quotas)
- **Concept:** Hosts offer a pool of storage. Renters claim a portion of it.
- **Implementation:** The backend must ensure `sum(active_instances.disk_size_gb) <= machine.storage_gb`. The Host Agent must enforce these quotas using ZFS/Btrfs or strict Docker volume limits to prevent a single renter from filling the host's drive.

### D. Interruptible Instances (Spot Pricing)
- **Concept:** Renters can bid a lower price for idle compute. If a higher-paying On-Demand user comes along, the interruptible instance is paused/destroyed.
- **Implementation:** Add an `interruptible_price_inr` to `machines`. Add `instance_type` (`on-demand`, `interruptible`) to `instances`. The Host Agent needs logic to gracefully stop (`docker stop`) interruptible containers when an On-Demand job arrives for the same resources.

## 5. Serverless Architecture

Velocity Infra implements a full serverless layer on top of the P2P GPU marketplace, allowing renters to deploy inference models with automatic scaling and routing.

### Architecture Components
- **Endpoints:** Named entry points that own scaling parameters (`max_workers`, `min_load`, `target_util`, `inactivity_timeout`).
- **Workergroups:** Defines what runs (template) and where (GPU filters/search params).
- **Workers:** A single GPU instance running a PyWorker sidecar + the ML model. Reports metrics back to the engine.
- **Serverless Engine:** Next.js API routes that handle request routing (picking the worker with the lowest queue time) and autoscaling (recruiting/releasing workers based on load vs. capacity).
- **PyWorker Sidecar:** A FastAPI Python web server co-located with the model in the same Docker network. It validates authentication, proxies requests to the model, and reports metrics (load, queue time) back to the engine.
- **Python SDK (`velocity-sdk`):** A pip package for clients to interact with endpoints, handling routing, retries, and authentication seamlessly.

### Data Flow
1. Client uses the Python SDK to call `client.generate(payload)`.
2. SDK requests a worker from the Serverless Engine (`POST /api/serverless/endpoints/[id]/route`).
3. Engine finds the active worker with the lowest queue time and returns its `worker_url` and a signed `auth_data` token.
4. SDK forwards the payload and `auth_data` directly to the PyWorker (`POST [worker_url]/generate`).
5. PyWorker validates the token, proxies the request to the local model container, and returns the inference result.
6. PyWorker continuously reports metrics to the Engine.
7. The Autoscaler periodically evaluates total load vs. capacity and scales workers up or down to maintain the `target_util`.