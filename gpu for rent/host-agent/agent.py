import os
import time
import subprocess
import requests
import json
import socket
import psutil
import signal
import sys
import re
import logging
import hashlib
import hmac
import shutil
from pathlib import Path
from datetime import datetime, timezone

# ==============================================================================
# VELOCITY INFRA - HOST AGENT v0.7.0-production
# Production-grade, security-hardened agent for host machines with NVIDIA GPUs.
# Polls Supabase for instance lifecycle events, manages Docker containers with
# GPU passthrough, and enforces runtime security (firewall, mining detection,
# network monitoring, resource limits, signed job verification).
# ==============================================================================

AGENT_VERSION = "0.7.0-production"
AGENT_TEST_MODE = False

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dmzeaolugvuykaqgcbji.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtemVhb2x1Z3Z1eWthcWdjYmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDMwNjUsImV4cCI6MjA5MTQ3OTA2NX0.FT0i0E5rVKQJtxwNgYcq3Fad-rfFzcZ7qHtiSptHbbk")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
MACHINE_ID = os.getenv("MACHINE_ID", "")

HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", "30"))
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "10"))
MONITOR_INTERVAL = int(os.getenv("MONITOR_INTERVAL", "60"))

TUNNEL_NAME = os.getenv("VELOCITY_TUNNEL_NAME", "").strip()
TUNNEL_DOMAIN = os.getenv("VELOCITY_TUNNEL_DOMAIN", "gpu.velocityinfra.in").strip()

LOG_FORMAT = "[%(asctime)s] %(levelname)-8s %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, datefmt="%Y-%m-%d %H:%M:%S")
log = logging.getLogger("velocity-agent")

KNOWN_MINERS = [
    "xmrig", "ethminer", "nbminer", "phoenixminer", "trex", "t-rex",
    "lolminer", "gminer", "claymore", "ccminer", "cpuminer", "minerd",
    "bfgminer", "cgminer", "nicehash", "excavator", "nanominer",
    "wildrig", "teamredminer", "srbminer",
]

MINING_POOL_PATTERNS = [
    r"stratum\+tcp://",
    r"stratum\+ssl://",
    r"pool\..*mining",
    r"nicehash\.com",
    r"nanopool\.org",
    r"ethermine\.org",
    r"2miners\.com",
    r"f2pool\.com",
    r"mining\..*pool",
]

JOB_SIGNING_SECRET = os.getenv("VELOCITY_JOB_SECRET", "").strip()

CONTAINER_NET_BANDWIDTH_MBPS = int(os.getenv("VELOCITY_NET_LIMIT_MBPS", "500"))

def verify_job_signature(job: dict) -> bool:
    """Verify HMAC-SHA256 signature on a job payload.
    
    The API signs jobs by computing HMAC(secret, instance_id + docker_image + status)
    and storing it in job['signature']. If JOB_SIGNING_SECRET is not set, skip verification.
    """
    if not JOB_SIGNING_SECRET:
        return True

    sig = job.get("signature")
    if not sig:
        log.warning("[SECURITY] Job %s has no signature — rejecting", job.get("id", "?")[:8])
        return False

    message = f"{job.get('id', '')}{job.get('docker_image', '')}{job.get('status', '')}"
    expected = hmac.new(
        JOB_SIGNING_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(sig, expected):
        log.warning("[SECURITY] Invalid signature on job %s — rejecting", job.get("id", "?")[:8])
        return False

    return True


def apply_network_bandwidth_limit(container_name: str):
    """Apply tc-based network bandwidth limits inside the container."""
    limit_kbit = CONTAINER_NET_BANDWIDTH_MBPS * 1000
    tc_cmds = [
        f"tc qdisc add dev eth0 root tbf rate {limit_kbit}kbit burst 256kbit latency 50ms",
    ]
    for tc_cmd in tc_cmds:
        full_cmd = ["docker", "exec", container_name, "bash", "-c", tc_cmd]
        try:
            subprocess.run(full_cmd, check=False, capture_output=True, timeout=10)
        except subprocess.SubprocessError:
            pass
    log.info("Network bandwidth limit set to %d Mbps for %s", CONTAINER_NET_BANDWIDTH_MBPS, container_name)


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

def _supabase_headers(content_type=False):
    """Build standard Supabase request headers.
    
    Uses SUPABASE_KEY (service role) if set, otherwise falls back to anon key.
    The apikey header always uses the anon key for PostgREST routing.
    """
    auth_key = SUPABASE_KEY if SUPABASE_KEY else SUPABASE_ANON_KEY
    h = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {auth_key}",
    }
    if content_type:
        h["Content-Type"] = "application/json"
    return h


def _patch_machine(payload):
    """PATCH the machine row for this host in Supabase."""
    try:
        res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}",
            headers=_supabase_headers(content_type=True),
            json=payload,
            timeout=15,
        )
        if res.status_code >= 400:
            log.error("Failed to patch machine %s: %s", MACHINE_ID, res.text)
    except requests.RequestException as exc:
        log.error("Network error patching machine %s: %s", MACHINE_ID, exc)


def _get_machine_tunnel_row():
    """Fetch tunnel-related columns for this machine."""
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}"
            "&select=tunnel_name,tunnel_id,tunnel_credentials",
            headers=_supabase_headers(),
            timeout=15,
        )
        if res.status_code != 200:
            return {}
        rows = res.json()
        return rows[0] if rows else {}
    except requests.RequestException as exc:
        log.error("Failed to fetch machine tunnel row: %s", exc)
        return {}


def _cloudflared_paths():
    """Paths for named-tunnel state, config, and credential file on disk."""
    base = Path.home() / ".cloudflared"
    base.mkdir(parents=True, exist_ok=True)
    mid = MACHINE_ID.replace("-", "")[:8] if MACHINE_ID else "unknown"
    return {
        "base": base,
        "credentials": base / f"velocity-machine-{mid}.json",
        "ingress_state": base / f"velocity-ingress-{mid}.json",
        "config": base / f"velocity-named-{mid}.yml",
        "pid": base / f"velocity-named-{mid}.pid",
    }


def _ensure_named_tunnel_credentials():
    """
    Ensure this machine has a named tunnel id and JSON credentials in Supabase.
    If missing, run `cloudflared tunnel create` and PATCH machines.
    Returns (tunnel_id, credentials_path) or (None, None) on failure.
    """
    row = _get_machine_tunnel_row()
    paths = _cloudflared_paths()
    cred_path = paths["credentials"]

    tid = row.get("tunnel_id")
    creds = row.get("tunnel_credentials")
    name = TUNNEL_NAME or f"velocity-{MACHINE_ID.replace('-', '')[:8]}"

    if tid and creds is not None:
        try:
            with open(cred_path, "w", encoding="utf-8") as f:
                json.dump(creds if isinstance(creds, dict) else creds, f)
        except OSError as exc:
            log.warning("Could not write tunnel credentials file: %s", exc)
            return None, None
        return tid, cred_path

    try:
        result = subprocess.run(
            ["cloudflared", "tunnel", "create", name],
            capture_output=True, text=True, timeout=120,
        )
    except (FileNotFoundError, subprocess.SubprocessError) as exc:
        log.warning("cloudflared tunnel create failed: %s", exc)
        return None, None

    if result.returncode != 0:
        log.warning(
            "cloudflared tunnel create exited %s: %s",
            result.returncode,
            (result.stderr or result.stdout or "")[:500],
        )
        return None, None

    out = (result.stdout or "") + (result.stderr or "")
    tunnel_uuid = None
    m_created = re.search(
        r"Created tunnel\s+\S+\s+with id\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
        out,
        re.I,
    )
    if m_created:
        tunnel_uuid = m_created.group(1)
    if not tunnel_uuid:
        m = re.search(
            r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
            out,
            re.I,
        )
        if m:
            tunnel_uuid = m.group(1)

    cred_file = None
    if tunnel_uuid:
        candidate = paths["base"] / f"{tunnel_uuid}.json"
        if candidate.is_file():
            cred_file = candidate

    if not cred_file:
        json_files = sorted(
            paths["base"].glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for p in json_files:
            if p.name in ("cert.pem",) or p.name.startswith("velocity-machine-"):
                continue
            try:
                with open(p, encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict) and data.get("TunnelID") or data.get("AccountTag"):
                    cred_file = p
                    if not tunnel_uuid:
                        tunnel_uuid = data.get("TunnelID") or tunnel_uuid
                    break
            except (OSError, json.JSONDecodeError):
                continue

    if not cred_file or not tunnel_uuid:
        log.warning(
            "Could not locate tunnel credentials after create. Output: %s",
            out[:500],
        )
        return None, None

    try:
        with open(cred_file, encoding="utf-8") as f:
            cred_obj = json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("Could not read tunnel credential file: %s", exc)
        return None, None

    try:
        shutil.copy2(cred_file, cred_path)
    except OSError:
        try:
            with open(cred_path, "w", encoding="utf-8") as f:
                json.dump(cred_obj, f)
        except OSError as exc:
            log.warning("Could not copy credentials to %s: %s", cred_path, exc)
            return None, None

    _patch_machine({
        "tunnel_name": name,
        "tunnel_id": tunnel_uuid,
        "tunnel_credentials": cred_obj,
    })
    return tunnel_uuid, cred_path


def _named_tunnel_route_dns(hostname: str):
    """Create a DNS route for this hostname on the named tunnel (idempotent)."""
    name = TUNNEL_NAME or f"velocity-{MACHINE_ID.replace('-', '')[:8]}"
    try:
        subprocess.run(
            ["cloudflared", "tunnel", "route", "dns", name, hostname],
            capture_output=True,
            text=True,
            timeout=120,
        )
    except (FileNotFoundError, subprocess.SubprocessError) as exc:
        log.debug("tunnel route dns (may already exist): %s", exc)


def _load_ingress_state(paths):
    p = paths["ingress_state"]
    if not p.is_file():
        return {}
    try:
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _save_ingress_state(paths, state):
    try:
        with open(paths["ingress_state"], "w", encoding="utf-8") as f:
            json.dump(state, f, indent=0)
    except OSError as exc:
        log.warning("Could not save ingress state: %s", exc)


def _stop_named_tunnel_daemon(paths):
    pid_file = paths["pid"]
    if pid_file.is_file():
        try:
            pid = int(pid_file.read_text().strip())
            os.kill(pid, signal.SIGTERM)
        except (ValueError, OSError, ProcessLookupError):
            pass
        try:
            pid_file.unlink()
        except OSError:
            pass
    # Clean up stray processes using our config file
    cfg = str(paths["config"])
    try:
        subprocess.run(
            ["pkill", "-f", f"cloudflared.*{cfg}"],
            capture_output=True,
            timeout=5,
        )
    except subprocess.SubprocessError:
        pass


def _write_named_config(paths, tunnel_id, cred_path, ingress_map):
    """Write cloudflared config YAML for tcp ingress entries."""
    cred_esc = str(cred_path).replace("\\", "/")
    lines = [
        f"tunnel: {tunnel_id}",
        f"credentials-file: {cred_esc}",
        "ingress:",
    ]
    for prefix, port in sorted(ingress_map.items(), key=lambda x: x[0]):
        host = f"{prefix}.{TUNNEL_DOMAIN}"
        lines.append(f"  - hostname: {host}")
        lines.append(f"    service: tcp://127.0.0.1:{int(port)}")
    lines.append("  - service: http_status:404")
    try:
        paths["config"].write_text("\n".join(lines) + "\n", encoding="utf-8")
    except OSError as exc:
        log.error("Could not write named tunnel config: %s", exc)
        raise


def _start_named_tunnel(instance_id, host_port):
    """
    Named Cloudflare tunnel: merge TCP ingress for this instance, route DNS, run cloudflared.
    Returns (tunnel_url, subprocess.Popen | None, extra_patch dict) or (None, None, {})
    if the caller should fall back to a quick tunnel.
    """
    if not TUNNEL_NAME:
        return None, None, {}

    paths = _cloudflared_paths()
    prefix = instance_id.replace("-", "")[:8]

    tunnel_id, cred_path = _ensure_named_tunnel_credentials()
    if not tunnel_id or not cred_path:
        log.warning("Named tunnel credentials unavailable; use quick tunnel or run tunnel login.")
        return None, None, {}

    state = _load_ingress_state(paths)
    state[prefix] = host_port
    _save_ingress_state(paths, state)

    hostname = f"{prefix}.{TUNNEL_DOMAIN}"
    _named_tunnel_route_dns(hostname)

    try:
        _write_named_config(paths, tunnel_id, cred_path, state)
    except OSError:
        state.pop(prefix, None)
        _save_ingress_state(paths, state)
        return None, None, {}

    _stop_named_tunnel_daemon(paths)

    cfg = str(paths["config"])
    try:
        proc = subprocess.Popen(
            ["cloudflared", "tunnel", "--config", cfg, "run"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError:
        state.pop(prefix, None)
        _save_ingress_state(paths, state)
        return None, None, {}
    except OSError as exc:
        log.warning("Could not start named cloudflared: %s", exc)
        state.pop(prefix, None)
        _save_ingress_state(paths, state)
        return None, None, {}

    try:
        paths["pid"].write_text(str(proc.pid), encoding="utf-8")
    except OSError:
        pass

    tunnel_url = f"https://{hostname}"
    extra = {"tunnel_hostname": hostname}
    log.info("Named Cloudflare tunnel: %s -> tcp://127.0.0.1:%s", hostname, host_port)
    return tunnel_url, proc, extra


def _start_quick_tunnel(host_port):
    """Quick tunnel (trycloudflare.com); returns (tunnel_url | None, Popen | None)."""
    tunnel_url = None
    try:
        log.info("Starting quick cloudflared tunnel for port %d...", host_port)
        tunnel_proc = subprocess.Popen(
            ["cloudflared", "tunnel", "--url", f"tcp://localhost:{host_port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        for _ in range(30):
            line = tunnel_proc.stdout.readline()
            if not line:
                break
            if ".trycloudflare.com" in line:
                for word in line.split():
                    if ".trycloudflare.com" in word:
                        tunnel_url = word.strip()
                        if not tunnel_url.startswith("http"):
                            tunnel_url = "https://" + tunnel_url
                        break
                if tunnel_url:
                    log.info("Cloudflare quick tunnel established: %s", tunnel_url)
                    break
        if not tunnel_url:
            log.warning("Cloudflare quick tunnel did not produce URL in time")
    except FileNotFoundError:
        log.warning(
            "cloudflared not installed. Install via: curl -L "
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 "
            "-o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared",
        )
        return None, None
    except Exception as exc:
        log.warning("Failed to start quick cloudflared tunnel: %s", exc)
        return None, None
    return tunnel_url, tunnel_proc


def _start_tunnel_for_instance(instance_id, host_port):
    """
    Start named tunnel when VELOCITY_TUNNEL_NAME is set; otherwise quick tunnel.
    Returns (tunnel_url, tunnel_proc, instance_extra dict for tunnel_hostname / port_mappings).
    """
    if TUNNEL_NAME:
        url, proc, extra = _start_named_tunnel(instance_id, host_port)
        if url:
            return url, proc, extra
        log.info("Falling back to quick Cloudflare tunnel for instance %s", instance_id[:8])
    u, p = _start_quick_tunnel(host_port)
    return u, p, {}


def _remove_named_tunnel_ingress(instance_id):
    """Remove this instance from merged named-tunnel state and restart cloudflared."""
    if not TUNNEL_NAME:
        return
    paths = _cloudflared_paths()
    prefix = instance_id.replace("-", "")[:8]
    state = _load_ingress_state(paths)
    if prefix not in state:
        return
    state.pop(prefix, None)
    _save_ingress_state(paths, state)

    row = _get_machine_tunnel_row()
    tunnel_id = row.get("tunnel_id")
    cred_path = paths["credentials"]
    if not tunnel_id or not cred_path.is_file():
        _stop_named_tunnel_daemon(paths)
        return

    if not state:
        _stop_named_tunnel_daemon(paths)
        try:
            paths["config"].unlink(missing_ok=True)
        except OSError:
            pass
        return

    try:
        _write_named_config(paths, tunnel_id, cred_path, state)
    except OSError:
        return
    _stop_named_tunnel_daemon(paths)
    cfg = str(paths["config"])
    try:
        proc = subprocess.Popen(
            ["cloudflared", "tunnel", "--config", cfg, "run"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            paths["pid"].write_text(str(proc.pid), encoding="utf-8")
        except OSError:
            pass
    except (FileNotFoundError, OSError) as exc:
        log.warning("Could not restart named tunnel after removal: %s", exc)


def _patch_instance(instance_id, payload):
    """PATCH an instance row in Supabase."""
    try:
        res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/instances?id=eq.{instance_id}",
            headers=_supabase_headers(content_type=True),
            json=payload,
            timeout=15,
        )
        if res.status_code >= 400:
            log.error("Failed to patch instance %s: %s", instance_id, res.text)
    except requests.RequestException as exc:
        log.error("Network error patching instance %s: %s", instance_id, exc)


def log_abuse_event(instance_id, event_type, severity, description, metadata=None):
    """Log a security / abuse event to Supabase."""
    payload = {
        "instance_id": instance_id,
        "machine_id": MACHINE_ID,
        "event_type": event_type,
        "severity": severity,
        "description": description,
        "metadata": metadata or {},
    }
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/abuse_logs",
            headers=_supabase_headers(content_type=True),
            json=payload,
            timeout=10,
        )
        log.info("[SECURITY] Logged abuse event: %s – %s", event_type, description)
    except requests.RequestException:
        log.warning("[SECURITY] Failed to log abuse event: %s", event_type)

# ---------------------------------------------------------------------------
# System introspection
# ---------------------------------------------------------------------------

def get_public_ip():
    """Get the public IP of this host machine."""
    try:
        return requests.get("https://api.ipify.org", timeout=5).text
    except requests.RequestException:
        return socket.gethostbyname(socket.gethostname())


def get_system_stats():
    """Collect CPU, RAM, disk, and GPU utilisation stats."""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    gpu_utilization = 0
    gpu_temp = 0
    gpu_memory_used = 0
    gpu_memory_total = 0

    if AGENT_TEST_MODE:
        gpu_utilization = 5
        gpu_temp = 42
        gpu_memory_used = 512
        gpu_memory_total = 24576
    else:
        try:
            result = subprocess.run(
                [
                    "nvidia-smi",
                    "--query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total",
                    "--format=csv,noheader,nounits",
                ],
                capture_output=True, text=True, check=True, timeout=10,
            )
            parts = result.stdout.strip().split("\n")[0].split(",")
            if len(parts) >= 4:
                gpu_utilization = int(parts[0].strip())
                gpu_temp = int(parts[1].strip())
                gpu_memory_used = int(parts[2].strip())
                gpu_memory_total = int(parts[3].strip())
        except (subprocess.SubprocessError, ValueError, IndexError):
            pass

    return {
        "cpu_percent": cpu_percent,
        "ram_percent": ram.percent,
        "ram_used_gb": round(ram.used / (1024 ** 3), 1),
        "ram_total_gb": round(ram.total / (1024 ** 3), 1),
        "disk_percent": disk.percent,
        "gpu_percent": gpu_utilization,
        "gpu_temp_c": gpu_temp,
        "gpu_memory_used_mb": gpu_memory_used,
        "gpu_memory_total_mb": gpu_memory_total,
    }


def get_cuda_version():
    """Detect CUDA version from nvidia-smi."""
    if AGENT_TEST_MODE:
        return "12.2"
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, check=True, timeout=10,
        )
        # Get CUDA version from nvidia-smi header
        full = subprocess.run(["nvidia-smi"], capture_output=True, text=True, check=True, timeout=10)
        for line in full.stdout.split("\n"):
            if "CUDA Version" in line:
                match = re.search(r"CUDA Version:\s*([\d.]+)", line)
                if match:
                    return match.group(1)
    except (subprocess.SubprocessError, ValueError):
        pass
    return None


def estimate_network_speed():
    """Lightweight network speed estimate using a small download test."""
    test_url = "https://speed.cloudflare.com/__down?bytes=10000000"  # 10MB
    try:
        start = time.time()
        resp = requests.get(test_url, timeout=30, stream=True)
        data = resp.content
        elapsed = time.time() - start
        if elapsed > 0:
            mbps = (len(data) * 8) / (elapsed * 1_000_000)
            return round(mbps, 1)
    except requests.RequestException:
        pass
    return 0


def estimate_network_upload_mbps():
    """Estimate upload throughput (Mbps) via a POST body to Cloudflare's speed endpoint."""
    size = 5 * 1024 * 1024  # 5 MiB
    try:
        data = os.urandom(size)
        start = time.time()
        resp = requests.post(
            "https://speed.cloudflare.com/__up",
            data=data,
            timeout=90,
        )
        elapsed = time.time() - start
        if elapsed > 0 and resp.status_code < 500:
            return round((len(data) * 8) / (elapsed * 1_000_000), 1)
    except requests.RequestException:
        pass
    try:
        data = os.urandom(2 * 1024 * 1024)
        start = time.time()
        requests.post("https://httpbin.org/post", data=data, timeout=90)
        elapsed = time.time() - start
        if elapsed > 0:
            return round((len(data) * 8) / (elapsed * 1_000_000), 1)
    except requests.RequestException:
        pass
    return 0


def get_gpu_count():
    """Return the number of visible NVIDIA GPUs (at least 1 if detection fails)."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--list-gpus"],
            capture_output=True, text=True, check=True, timeout=15,
        )
        lines = [ln for ln in result.stdout.splitlines() if ln.strip()]
        return max(1, len(lines))
    except (subprocess.SubprocessError, FileNotFoundError):
        return 1


def parse_pcie_bandwidth_gbps():
    """Parse aggregate PCIe bandwidth from `nvidia-smi -q` when available (Gb/s)."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "-q"],
            capture_output=True, text=True, check=True, timeout=30,
        )
        text = result.stdout
        # Some drivers report explicit throughput in MB/s or GB/s
        mb_s_vals = [float(m.group(1)) for m in re.finditer(
            r"(?:Rx|Tx|Throughput)\s*[^:]*:\s*([\d.]+)\s*MB/s", text, re.IGNORECASE
        )]
        if mb_s_vals:
            peak_mb_s = max(mb_s_vals)
            return round((peak_mb_s * 8) / 1000, 2)
        gbs = [float(m.group(1)) for m in re.finditer(
            r"(?:Rx|Tx|Throughput)\s*[^:]*:\s*([\d.]+)\s*GB/s", text, re.IGNORECASE
        )]
        if gbs:
            return round(max(gbs) * 8, 2)
    except (subprocess.SubprocessError, FileNotFoundError, ValueError):
        pass
    return 0.0


def measure_dlperf_tflops():
    """Rough TFLOPS from a large FP32 GEMM on GPU (torch) or CPU (numpy)."""
    n = 4096
    try:
        import torch
        if torch.cuda.is_available():
            a = torch.randn(n, n, device="cuda", dtype=torch.float32)
            b = torch.randn(n, n, device="cuda", dtype=torch.float32)
            for _ in range(2):
                torch.matmul(a, b)
            torch.cuda.synchronize()
            iters = 10
            t0 = time.time()
            for _ in range(iters):
                torch.matmul(a, b)
            torch.cuda.synchronize()
            elapsed = time.time() - t0
            if elapsed <= 0:
                return 0.0
            flops = iters * 2 * (n ** 3)
            return round((flops / elapsed) / 1e12, 2)
    except Exception:
        pass
    try:
        import numpy as np
        a = np.random.rand(n, n).astype(np.float32)
        b = np.random.rand(n, n).astype(np.float32)
        for _ in range(2):
            np.dot(a, b)
        iters = 5
        t0 = time.time()
        for _ in range(iters):
            np.dot(a, b)
        elapsed = time.time() - t0
        if elapsed <= 0:
            return 0.0
        flops = iters * 2 * (n ** 3)
        return round((flops / elapsed) / 1e12, 2)
    except Exception:
        return 0.0


def test_bind_ports_per_gpu():
    """
    Verify we can bind TCP ports in 22000–22100: three consecutive ports per GPU
    starting at 22000 + gpu_index * 3.
    """
    ngpu = get_gpu_count()
    all_ok = True
    for g in range(ngpu):
        for k in range(3):
            port = 22000 + g * 3 + k
            if port > 22100:
                log.warning("[SELF-TEST] Port %d out of range 22000–22100 (gpu %d)", port, g)
                all_ok = False
                continue
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    s.bind(("0.0.0.0", port))
            except OSError:
                all_ok = False
    return all_ok


def get_cached_images():
    """Return the list of locally cached Docker images."""
    if AGENT_TEST_MODE:
        return ["pytorch/pytorch:latest", "jupyter/scipy-notebook:latest"]
    try:
        result = subprocess.run(
            ["docker", "images", "--format", "{{.Repository}}:{{.Tag}}"],
            capture_output=True, text=True, check=True, timeout=15,
        )
        return [
            img
            for img in result.stdout.strip().split("\n")
            if img and img != "<none>:<none>"
        ]
    except subprocess.SubprocessError:
        return []


def get_running_containers():
    """Return a list of (container_name, container_id) for velocity pods."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=velocity-pod-", "--format", "{{.Names}}\t{{.ID}}"],
            capture_output=True, text=True, check=True, timeout=10,
        )
        containers = []
        for line in result.stdout.strip().split("\n"):
            if "\t" in line:
                name, cid = line.split("\t", 1)
                containers.append((name.strip(), cid.strip()))
        return containers
    except subprocess.SubprocessError:
        return []

# ---------------------------------------------------------------------------
# Docker network setup
# ---------------------------------------------------------------------------

def ensure_docker_network():
    """Create an isolated Docker bridge network if it doesn't already exist."""
    try:
        inspect = subprocess.run(
            ["docker", "network", "inspect", "velocity-net"],
            capture_output=True, text=True, check=False,
        )
        if inspect.returncode == 0:
            log.info("Docker network 'velocity-net' already exists.")
            return
    except subprocess.SubprocessError:
        pass

    try:
        subprocess.run(
            [
                "docker", "network", "create",
                "--driver", "bridge",
                "--opt", "com.docker.network.bridge.enable_icc=true",
                "--opt", "com.docker.network.bridge.enable_ip_masquerade=true",
                "velocity-net",
            ],
            check=True, capture_output=True,
        )
        log.info("Created Docker network 'velocity-net'.")
    except subprocess.SubprocessError as exc:
        log.warning("Could not create docker network: %s", exc)

# ---------------------------------------------------------------------------
# Container firewall
# ---------------------------------------------------------------------------

def setup_container_firewall(container_name):
    """Apply strict iptables egress rules inside the container."""
    rules = [
        # Block SMTP (spam)
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "25", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "587", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "465", "-j", "DROP"],
        # Block BitTorrent
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "6881:6999", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "udp", "--dport", "6881:6999", "-j", "DROP"],
        # Block Telnet
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "23", "-j", "DROP"],
        # Block NetBIOS
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "135:139", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "udp", "--dport", "135:139", "-j", "DROP"],
        # Block SMB
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "445", "-j", "DROP"],
        # Block common mining pool Stratum ports
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "3333", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "4444", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "5555", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "7777", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "9999", "-j", "DROP"],
        ["iptables", "-A", "OUTPUT", "-p", "tcp", "--dport", "14444", "-j", "DROP"],
    ]
    applied = 0
    for rule_args in rules:
        cmd = ["docker", "exec", container_name] + rule_args
        try:
            subprocess.run(cmd, check=False, capture_output=True, timeout=10)
            applied += 1
        except subprocess.SubprocessError:
            pass
    log.info("Applied %d/%d firewall rules to %s", applied, len(rules), container_name)

# ---------------------------------------------------------------------------
# Security monitoring
# ---------------------------------------------------------------------------

def _parse_net_io(net_io_str):
    """Parse Docker NetIO string like '1.5GB / 800MB' into (tx_bytes, rx_bytes)."""
    multipliers = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3, "TB": 1024**4,
                   "kB": 1024, "MiB": 1024**2, "GiB": 1024**3}
    parts = net_io_str.split("/")
    values = []
    for part in parts:
        part = part.strip()
        num = ""
        unit = ""
        for ch in part:
            if ch.isdigit() or ch == ".":
                num += ch
            else:
                unit += ch
        unit = unit.strip()
        try:
            val = float(num) * multipliers.get(unit, 1)
        except ValueError:
            val = 0
        values.append(val)
    return tuple(values) if len(values) >= 2 else (0, 0)


def monitor_container_network(container_name, instance_id):
    """Check for suspicious network activity on a container."""
    try:
        result = subprocess.run(
            ["docker", "stats", container_name, "--no-stream", "--format", "{{.NetIO}}"],
            capture_output=True, text=True, check=True, timeout=15,
        )
        net_io = result.stdout.strip()
        if not net_io:
            return

        tx_bytes, rx_bytes = _parse_net_io(net_io)

        egress_gb = tx_bytes / (1024 ** 3)
        if egress_gb > 1.0:
            log.warning(
                "[SECURITY] High egress on %s: %s (%.2f GB out)",
                container_name, net_io, egress_gb,
            )
            log_abuse_event(
                instance_id, "high_egress", "warning",
                f"Cumulative egress {egress_gb:.2f} GB on {container_name}",
                {"net_io": net_io, "egress_gb": round(egress_gb, 2)},
            )
    except subprocess.SubprocessError:
        pass


def check_for_crypto_mining(container_name, instance_id):
    """Detect known crypto-mining processes inside a container."""
    try:
        result = subprocess.run(
            ["docker", "exec", container_name, "ps", "aux"],
            capture_output=True, text=True, check=True, timeout=10,
        )
        processes = result.stdout.lower()

        for miner in KNOWN_MINERS:
            if miner in processes:
                log.critical(
                    "[SECURITY] Crypto miner '%s' detected in %s!", miner, container_name,
                )
                log_abuse_event(
                    instance_id, "crypto_mining", "critical",
                    f"Detected {miner} process in {container_name}",
                    {"process_list_hash": hashlib.sha256(result.stdout.encode()).hexdigest()},
                )
                subprocess.run(["docker", "kill", container_name], check=False, timeout=10)
                return True

        for pattern in MINING_POOL_PATTERNS:
            if re.search(pattern, processes):
                log.critical(
                    "[SECURITY] Mining pool pattern '%s' found in %s!", pattern, container_name,
                )
                log_abuse_event(
                    instance_id, "crypto_mining", "critical",
                    f"Mining pool connection pattern in {container_name}",
                )
                subprocess.run(["docker", "kill", container_name], check=False, timeout=10)
                return True

    except subprocess.SubprocessError:
        pass
    return False


def check_gpu_processes(container_name, instance_id):
    """Use nvidia-smi to look for suspicious GPU compute processes."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-compute-apps=pid,process_name,used_memory", "--format=csv,noheader"],
            capture_output=True, text=True, check=True, timeout=10,
        )
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            lower = line.lower()
            for miner in KNOWN_MINERS:
                if miner in lower:
                    log.critical("[SECURITY] GPU miner '%s' on host! Line: %s", miner, line.strip())
                    log_abuse_event(
                        instance_id, "gpu_crypto_mining", "critical",
                        f"GPU process matched miner '{miner}'",
                        {"nvidia_smi_line": line.strip()},
                    )
                    subprocess.run(["docker", "kill", container_name], check=False, timeout=10)
                    return True
    except subprocess.SubprocessError:
        pass
    return False


def monitor_running_containers():
    """Run all security checks against every running velocity container."""
    containers = get_running_containers()
    for name, cid in containers:
        instance_id = name.replace("velocity-pod-", "")
        check_for_crypto_mining(name, instance_id)
        check_gpu_processes(name, instance_id)
        monitor_container_network(name, instance_id)

# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------

def heartbeat():
    """Send heartbeat with system stats and cached images to Supabase.

    Does not modify machines.status (rental / availability is owned by the contract API).
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    cached_images = get_cached_images()
    stats = get_system_stats()

    payload = {
        "public_ip": get_public_ip(),
        "last_heartbeat": now_iso,
        "daemon_version": AGENT_VERSION,
        "cached_images": cached_images,
        "cpu_usage": stats["cpu_percent"],
        "ram_usage": stats["ram_percent"],
        "gpu_usage": stats["gpu_percent"],
        "disk_usage": stats["disk_percent"],
        "gpu_temp": stats["gpu_temp_c"],
        "gpu_memory_used_mb": stats["gpu_memory_used_mb"],
        "gpu_memory_total_mb": stats["gpu_memory_total_mb"],
        "cuda_version": get_cuda_version(),
    }

    try:
        res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}",
            headers=_supabase_headers(content_type=True),
            json=payload,
            timeout=15,
        )
        if res.status_code >= 400:
            log.error("Heartbeat failed: %s", res.text)
        else:
            log.info(
                "Heartbeat sent. CPU=%s%% RAM=%s%% GPU=%s%% TEMP=%s°C DISK=%s%%",
                stats["cpu_percent"], stats["ram_percent"],
                stats["gpu_percent"], stats["gpu_temp_c"],
                stats["disk_percent"],
            )
        # Check if a self-test was requested from the dashboard
        if res.status_code < 400:
            try:
                machine_res = requests.get(
                    f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}&select=self_test_requested",
                    headers=_supabase_headers(),
                    timeout=10,
                )
                if machine_res.status_code == 200:
                    rows = machine_res.json()
                    if rows and rows[0].get("self_test_requested"):
                        log.info("Self-test requested from dashboard — running now...")
                        requests.patch(
                            f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}",
                            headers=_supabase_headers(content_type=True),
                            json={"self_test_requested": False},
                            timeout=10,
                        )
                        run_self_test()
            except requests.RequestException:
                pass

    except requests.RequestException as exc:
        log.error("Heartbeat network error: %s", exc)

# ---------------------------------------------------------------------------
# Port allocation
# ---------------------------------------------------------------------------

def _local_tcp_port_unbound(port):
    """True if nothing accepts connections on localhost:port (same heuristic as find_free_port)."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) != 0


def find_free_port(start_port=22000, end_port=23000):
    """Find a free TCP port in the specified range."""
    for port in range(start_port, end_port):
        if _local_tcp_port_unbound(port):
            return port
    raise RuntimeError(f"No free ports available in range {start_port}-{end_port}")


def find_consecutive_free_ports(count=5, start_port=22000, end_port=23000):
    """Find `count` consecutive TCP ports free on localhost (for multi-port container publish)."""
    last_start = end_port - count
    if last_start < start_port:
        raise RuntimeError(f"Range {start_port}-{end_port} cannot fit {count} consecutive ports")
    for base in range(start_port, last_start + 1):
        if all(_local_tcp_port_unbound(base + i) for i in range(count)):
            return base
    raise RuntimeError(
        f"No {count} consecutive free ports available in range {start_port}-{end_port}"
    )

# ---------------------------------------------------------------------------
# Instance lifecycle
# ---------------------------------------------------------------------------

def check_maintenance():
    """Warn on upcoming maintenance; flag instances once a window has started."""
    headers = _supabase_headers()
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/maintenance_windows"
            f"?machine_id=eq.{MACHINE_ID}&status=eq.scheduled",
            headers=headers,
            timeout=15,
        )
        if res.status_code != 200:
            return
        windows = res.json()
    except requests.RequestException as exc:
        log.error("Maintenance poll failed: %s", exc)
        return

    now = datetime.now(timezone.utc)
    for w in windows:
        raw = w.get("start_date")
        if not raw:
            continue
        try:
            start = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

        delta_s = (start - now).total_seconds()
        wid = w.get("id", "?")
        if 0 < delta_s <= 15 * 60:
            log.warning(
                "[MAINTENANCE] Window %s starts in %.1f minutes",
                wid, delta_s / 60.0,
            )
        if start <= now:
            log.warning(
                "[MAINTENANCE] Scheduled window %s is active (start was %s)",
                wid, raw,
            )
            try:
                pr = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/instances?machine_id=eq.{MACHINE_ID}",
                    headers=_supabase_headers(content_type=True),
                    json={"maintenance_warning": True},
                    timeout=15,
                )
                if pr.status_code >= 400:
                    log.debug(
                        "Instance maintenance_warning patch not applied: %s",
                        pr.text[:200],
                    )
            except requests.RequestException as exc:
                log.warning("Could not set maintenance_warning on instances: %s", exc)


def check_for_jobs():
    """Poll Supabase for instance lifecycle events assigned to this machine."""
    headers = _supabase_headers()

    # 1. Instances to create (status=creating)
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/instances?machine_id=eq.{MACHINE_ID}&status=eq.creating",
            headers=headers, timeout=15,
        )
        if res.status_code == 200:
            for job in res.json():
                if not verify_job_signature(job):
                    _patch_instance(job["id"], {"status": "error"})
                    log_abuse_event(job["id"], "invalid_signature", "critical", "Job rejected: invalid or missing HMAC signature")
                    continue
                log.info("[NEW JOB] Instance %s – launching container…", job["id"])
                launch_container(job)
    except requests.RequestException as exc:
        log.error("Error polling for creating jobs: %s", exc)

    # 2. Instances to stop (status=stopped, container still assigned)
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/instances?machine_id=eq.{MACHINE_ID}&status=eq.stopped&container_id=not.is.null",
            headers=headers, timeout=15,
        )
        if res.status_code == 200:
            for job in res.json():
                log.info("[STOP JOB] Instance %s – stopping container…", job["id"])
                stop_container(job)
    except requests.RequestException as exc:
        log.error("Error polling for stop jobs: %s", exc)

    # 3. Instances to destroy (status=destroyed, container still assigned)
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/instances?machine_id=eq.{MACHINE_ID}&status=eq.destroyed&container_id=not.is.null",
            headers=headers, timeout=15,
        )
        if res.status_code == 200:
            for job in res.json():
                log.info("[DESTROY JOB] Instance %s – destroying container…", job["id"])
                destroy_container(job)
    except requests.RequestException as exc:
        log.error("Error polling for destroy jobs: %s", exc)


def launch_container(job):
    """Pull Docker image and start a security-hardened container with GPU access."""
    instance_id = job["id"]
    docker_image = job.get("docker_image", "runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04")

    launch_mode = job.get("launch_mode", "jupyter")

    if TUNNEL_NAME:
        log.info(
            "Named Cloudflare tunnel mode: %s (domain %s)",
            TUNNEL_NAME,
            TUNNEL_DOMAIN,
        )

    _patch_instance(instance_id, {"status": "loading"})

    try:
        if launch_mode == "serverless":
            host_port = find_free_port()
            port_mappings = None
        else:
            host_port = find_consecutive_free_ports(5)
            port_mappings = {
                "22": host_port,
                "8888": host_port + 1,
                "8080": host_port + 2,
                "6006": host_port + 3,
                "3000": host_port + 4,
            }
        container_name = f"velocity-pod-{instance_id[:8]}"
        pyworker_name = f"velocity-pyworker-{instance_id[:8]}"

        log.info("Pulling image %s …", docker_image)
        subprocess.run(["docker", "pull", docker_image], check=True, timeout=600)

        log.info("Starting container %s on port %d …", container_name, host_port)

        # Fetch actual machine specs for resource limits
        try:
            machine_res = requests.get(
                f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}&select=ram_gb,vcpu_count",
                headers=_supabase_headers(),
                timeout=10,
            )
            if machine_res.status_code == 200:
                machine_data = machine_res.json()
                if machine_data:
                    machine_specs = machine_data[0]
                else:
                    machine_specs = {}
            else:
                machine_specs = {}
        except requests.RequestException:
            machine_specs = {}

        ram_gb = job.get("ram_gb", machine_specs.get("ram_gb", 16))
        gpu_indices = job.get("gpu_indices", None)
        if gpu_indices and len(gpu_indices) > 0:
            gpu_flag = f'"device={",".join(str(i) for i in gpu_indices)}"'
        else:
            gpu_flag = "all"
        if gpu_flag != "all":
            # Strip shell-style quotes so subprocess passes Docker `device=…` correctly
            gpu_flag = gpu_flag.strip('"')
        nv_visible = (
            ",".join(str(i) for i in gpu_indices)
            if gpu_indices and len(gpu_indices) > 0
            else "all"
        )
        vcpu_count = job.get("vcpu_count", machine_specs.get("vcpu_count", 4))

        cmd = [
            "docker", "run", "-d",
            "--name", container_name,
            "--gpus", gpu_flag,
            # Prevent privilege escalation
            "--security-opt", "no-new-privileges:true",
            # Drop all capabilities, re-add only what's needed
            "--cap-drop", "ALL",
            "--cap-add", "SYS_PTRACE",
            "--tmpfs", "/tmp:rw,nosuid,size=4g",
            "--tmpfs", "/run:rw,nosuid",
            "--tmpfs", "/root:rw,nosuid,size=1g",
            "--tmpfs", "/var:rw,nosuid,size=2g",
            "--tmpfs", "/home:rw,nosuid,size=1g",
            "-v", f"velocity-data-{instance_id[:8]}:/workspace:rw",
            # Resource limits
            "--memory", f"{ram_gb}g",
            "--memory-swap", f"{ram_gb}g",
            "--cpus", str(vcpu_count),
            "--pids-limit", "4096",
            # Network isolation
            "--network", "velocity-net",
            "--pid", "container",
            "--ipc", "private",
        ]
        
        if launch_mode == "serverless":
            # In serverless mode, we don't map ports directly to the model container
            # We also need to know what port the model runs on internally (e.g., 8000 for vLLM)
            model_internal_port = job.get("model_internal_port", 8000)
            
            # Environment
            cmd.extend([
                "-e", f"NVIDIA_VISIBLE_DEVICES={nv_visible}",
                docker_image,
            ])
            
            # Add launch args if any
            launch_args = job.get("launch_args", "")
            if launch_args:
                import shlex
                cmd.extend(shlex.split(launch_args))
                
        else:
            # Standard mode (jupyter/ssh): publish SSH, Jupyter, and common dev ports; expose host bindings in-container.
            cmd.extend([
                "-p", f"{host_port}:22",
                "-p", f"{host_port + 1}:8888",
                "-p", f"{host_port + 2}:8080",
                "-p", f"{host_port + 3}:6006",
                "-p", f"{host_port + 4}:3000",
                "-e", f"VELOCITY_TCP_PORT_22={host_port}",
                "-e", f"VELOCITY_TCP_PORT_8888={host_port + 1}",
                "-e", f"VELOCITY_TCP_PORT_8080={host_port + 2}",
                "-e", f"VELOCITY_TCP_PORT_6006={host_port + 3}",
                "-e", f"VELOCITY_TCP_PORT_3000={host_port + 4}",
                "-e", f"VELOCITY_INSTANCE_ID={instance_id}",
                "-e", f"VELOCITY_MACHINE_ID={MACHINE_ID}",
                "-e", f"PUBLIC_KEY={job.get('ssh_public_key', '')}",
                "-e", f"NVIDIA_VISIBLE_DEVICES={nv_visible}",
                docker_image,
            ])

        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=120)
        container_id = result.stdout.strip()
        log.info("Container started: %s (%s)", container_name, container_id[:12])

        setup_container_firewall(container_name)
        apply_network_bandwidth_limit(container_name)

        if launch_mode != "serverless":
            # Set up SSH server inside the container
            ssh_pubkey = job.get("ssh_public_key", "")
            ssh_setup_script = (
                "apt-get update -qq && "
                "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openssh-server > /dev/null 2>&1; "
                "mkdir -p /run/sshd /root/.ssh; "
                "echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config; "
                "echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config; "
            )
            if ssh_pubkey:
                safe_key = ssh_pubkey.replace("'", "'\\''")
                ssh_setup_script += f"echo '{safe_key}' >> /root/.ssh/authorized_keys; chmod 600 /root/.ssh/authorized_keys; "
                ssh_setup_script += "echo 'PubkeyAuthentication yes' >> /etc/ssh/sshd_config; "
            else:
                # Generate a random password if no SSH key provided
                import secrets
                ssh_password = secrets.token_urlsafe(12)
                ssh_setup_script += f"echo 'root:{ssh_password}' | chpasswd; "
                _patch_instance(instance_id, {"ssh_password": ssh_password})
            ssh_setup_script += "/usr/sbin/sshd -D &"

            log.info("Setting up SSH server in container %s...", container_name)
            try:
                subprocess.run(
                    ["docker", "exec", "-d", container_name, "bash", "-c", ssh_setup_script],
                    check=True, timeout=120,
                )
                log.info("SSH server started in %s", container_name)
            except subprocess.CalledProcessError as exc:
                log.warning("SSH setup failed (image may not support apt): %s", exc)

        tunnel_extra = {}
        if launch_mode == "serverless":
            # Launch PyWorker sidecar
            log.info("Starting PyWorker sidecar %s …", pyworker_name)
            
            # Determine engine URL
            # In production, this should be the actual API URL
            engine_url = os.getenv("ENGINE_URL", "https://velocity-infra.vercel.app/api/serverless")
            
            # Get the worker ID from the job (assuming job has a worker_id field if it's a serverless job)
            worker_id = job.get("worker_id", instance_id)
            
            pyworker_cmd = [
                "docker", "run", "-d",
                "--name", pyworker_name,
                "--network", "velocity-net",
                "-p", f"{host_port}:5000",
                "-e", f"MODEL_HOST={container_name}",
                "-e", f"MODEL_PORT={model_internal_port}",
                "-e", f"WORKER_ID={worker_id}",
                "-e", f"ENGINE_URL={engine_url}",
                "-e", f"AUTH_SECRET={SUPABASE_KEY[:10]}", # Simple auth using part of service key
                "velocity-pyworker:latest" # Assuming this image is built/available
            ]
            
            try:
                pyworker_result = subprocess.run(pyworker_cmd, capture_output=True, text=True, check=True, timeout=60)
                log.info("PyWorker started: %s", pyworker_name)
            except subprocess.CalledProcessError as exc:
                log.error("Failed to start PyWorker: %s", exc.stderr)
                # Cleanup model container
                subprocess.run(["docker", "rm", "-f", container_id], check=False)
                raise

            tunnel_url, _tunnel_proc, tunnel_extra = _start_tunnel_for_instance(instance_id, host_port)
            if tunnel_url:
                try:
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/workers?id=eq.{worker_id}",
                        headers=_supabase_headers(content_type=True),
                        json={"worker_url": tunnel_url, "state": "active"},
                        timeout=10,
                    )
                except requests.RequestException as e:
                    log.warning("Failed to update worker URL: %s", e)
        else:
            tunnel_url, _tunnel_proc, tunnel_extra = _start_tunnel_for_instance(instance_id, host_port)

        running_update = {
            "container_id": container_id,
            "host_port": host_port,
            "tunnel_url": tunnel_url,
            "status": "running",
        }
        if port_mappings is not None:
            running_update["port_mappings"] = port_mappings
        if tunnel_extra.get("tunnel_hostname"):
            running_update["tunnel_hostname"] = tunnel_extra["tunnel_hostname"]
        _patch_instance(instance_id, running_update)
        log.info("Instance %s is running. Renter can connect on port %d.", instance_id, host_port)

    except subprocess.TimeoutExpired:
        log.error("Timed out while launching container for instance %s", instance_id)
        _patch_instance(instance_id, {"status": "error"})
    except subprocess.CalledProcessError as exc:
        log.error("Docker error for instance %s: %s", instance_id, exc.stderr or exc)
        _patch_instance(instance_id, {"status": "error"})
    except Exception as exc:
        log.error("Unexpected error launching instance %s: %s", instance_id, exc)
        _patch_instance(instance_id, {"status": "error"})


def stop_container(job):
    """Stop a running container (pauses GPU usage, preserves data)."""
    instance_id = job["id"]
    container_id = job.get("container_id")
    if not container_id:
        return

    log.info("Stopping container %s …", container_id[:12])
    try:
        subprocess.run(["docker", "stop", container_id], check=True, timeout=30)
        log.info("Container %s stopped.", container_id[:12])
    except subprocess.TimeoutExpired:
        log.warning("Stop timed out for %s – force-killing.", container_id[:12])
        subprocess.run(["docker", "kill", container_id], check=False, timeout=10)
    except subprocess.CalledProcessError as exc:
        log.error("Failed to stop container %s: %s", container_id[:12], exc)


def destroy_container(job):
    """Remove a container, its data volume, and clear the DB record."""
    instance_id = job["id"]
    container_id = job.get("container_id")
    if not container_id:
        return

    container_name = f"velocity-pod-{instance_id[:8]}"
    pyworker_name = f"velocity-pyworker-{instance_id[:8]}"
    volume_name = f"velocity-data-{instance_id[:8]}"

    log.info("Destroying container %s …", container_id[:12])
    try:
        subprocess.run(["docker", "rm", "-f", container_id], check=True, timeout=30)
        log.info("Container %s removed.", container_id[:12])
    except subprocess.CalledProcessError as exc:
        log.error("Failed to remove container %s: %s", container_id[:12], exc)

    # Try to remove pyworker if it exists
    try:
        subprocess.run(["docker", "rm", "-f", pyworker_name], check=False, timeout=10)
        log.info("PyWorker %s removed (if existed).", pyworker_name)
    except subprocess.SubprocessError:
        pass

    try:
        subprocess.run(["docker", "volume", "rm", "-f", volume_name], check=False, capture_output=True, timeout=15)
        log.info("Volume %s removed.", volume_name)
    except subprocess.SubprocessError:
        log.warning("Could not remove volume %s (may not exist).", volume_name)

    _remove_named_tunnel_ingress(instance_id)
    try:
        host_port = job.get("host_port")
        if host_port and not TUNNEL_NAME:
            subprocess.run(
                ["pkill", "-f", f"cloudflared.*{host_port}"],
                check=False,
                timeout=5,
            )
    except subprocess.SubprocessError:
        pass

    _patch_instance(
        instance_id,
        {
            "container_id": None,
            "host_port": None,
            "port_mappings": None,
            "tunnel_url": None,
            "tunnel_hostname": None,
        },
    )

# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------

def signal_handler(sig, frame):
    log.info("Received signal %s – shutting down gracefully…", sig)
    try:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}",
            headers=_supabase_headers(content_type=True),
            json={"daemon_version": f"{AGENT_VERSION}-offline"},
            timeout=5,
        )
    except requests.RequestException:
        pass
    sys.exit(0)

def run_self_test():
    """Run comprehensive self-test and report results to Supabase."""
    log.info("=" * 60)
    log.info("VELOCITY INFRA - MACHINE SELF-TEST")
    log.info("=" * 60)

    results = {}
    all_passed = True

    # Test 1: CUDA version
    cuda = get_cuda_version()
    cuda_ok = False
    if cuda:
        try:
            major = int(cuda.split(".")[0])
            cuda_ok = major >= 12
        except (ValueError, IndexError):
            pass
    results["cuda_version"] = cuda or "not detected"
    results["cuda_ok"] = cuda_ok
    if not cuda_ok:
        all_passed = False
    log.info("[%s] CUDA Version: %s (need >= 12.0)", "PASS" if cuda_ok else "FAIL", cuda or "N/A")

    # Test 2: GPU VRAM
    stats = get_system_stats()
    vram_gb = stats["gpu_memory_total_mb"] / 1024 if stats["gpu_memory_total_mb"] > 0 else 0
    vram_ok = vram_gb >= 7
    results["vram_gb"] = round(vram_gb, 1)
    results["vram_ok"] = vram_ok
    if not vram_ok:
        all_passed = False
    log.info("[%s] GPU VRAM: %.1f GB (need >= 7 GB)", "PASS" if vram_ok else "FAIL", vram_gb)

    # Test 3: GPU temperature
    temp_ok = stats["gpu_temp_c"] < 90
    results["gpu_temp"] = stats["gpu_temp_c"]
    results["temp_ok"] = temp_ok
    if not temp_ok:
        all_passed = False
    log.info("[%s] GPU Temp: %d°C (need < 90°C)", "PASS" if temp_ok else "FAIL", stats["gpu_temp_c"])

    # Test 4: Network download
    log.info("Testing network speed (10MB download)...")
    net_speed = estimate_network_speed()
    net_ok = net_speed >= 50
    results["net_speed_mbps"] = net_speed
    results["net_ok"] = net_ok
    if not net_ok:
        all_passed = False
    log.info("[%s] Network download: %.1f Mbps (need >= 50 Mbps)", "PASS" if net_ok else "FAIL", net_speed)

    # Test 5: Network upload
    log.info("Testing network upload...")
    net_up = estimate_network_upload_mbps()
    net_up_ok = net_up >= 25
    results["net_up_mbps"] = net_up
    results["net_up_ok"] = net_up_ok
    if not net_up_ok:
        all_passed = False
    log.info("[%s] Network upload: %.1f Mbps (need >= 25 Mbps)", "PASS" if net_up_ok else "FAIL", net_up)

    # Test 6: Host port binding (3 ports per GPU in 22000–22100)
    log.info("Testing TCP bind on host ports (22000–22100, 3 per GPU)...")
    ports_ok = test_bind_ports_per_gpu()
    results["ports_ok"] = ports_ok
    if not ports_ok:
        all_passed = False
    log.info("[%s] Port bind test (per GPU)", "PASS" if ports_ok else "FAIL")

    # Test 7: PCIe bandwidth (from nvidia-smi -q when reported; optional)
    pcie_gbps = parse_pcie_bandwidth_gbps()
    pcie_reported = pcie_gbps > 0
    results["pcie_bandwidth_gbps"] = pcie_gbps
    results["pcie_reported"] = pcie_reported
    log.info(
        "[%s] PCIe bandwidth (parsed): %.2f Gb/s",
        "OK" if pcie_reported else "SKIP (not in nvidia-smi -q)",
        pcie_gbps,
    )

    # Test 8: DLPerf (GEMM TFLOPS)
    log.info("Running DLPerf matrix benchmark...")
    dlperf = measure_dlperf_tflops()
    dlperf_ok = dlperf > 0
    results["dlperf_score"] = dlperf
    results["dlperf_ok"] = dlperf_ok
    if not dlperf_ok:
        all_passed = False
    log.info("[%s] DLPerf: %.2f TFLOPS", "PASS" if dlperf_ok else "FAIL", dlperf)

    # Test 9: Docker available
    docker_ok = False
    try:
        subprocess.run(["docker", "info"], capture_output=True, check=True, timeout=10)
        docker_ok = True
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    results["docker_ok"] = docker_ok
    if not docker_ok:
        all_passed = False
    log.info("[%s] Docker: %s", "PASS" if docker_ok else "FAIL", "available" if docker_ok else "not found")

    # Test 10: NVIDIA Docker runtime
    nvidia_ok = False
    try:
        result = subprocess.run(
            ["docker", "run", "--rm", "--gpus", "all", "nvidia/cuda:12.2.2-base-ubuntu22.04", "nvidia-smi"],
            capture_output=True, text=True, check=True, timeout=120,
        )
        nvidia_ok = "CUDA" in result.stdout
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    results["nvidia_docker_ok"] = nvidia_ok
    if not nvidia_ok:
        all_passed = False
    log.info("[%s] NVIDIA Docker: %s", "PASS" if nvidia_ok else "FAIL", "working" if nvidia_ok else "failed")

    # Test 11: Storage speed (basic write test)
    storage_speed = 0
    try:
        test_file = "/tmp/velocity_speed_test"
        size_mb = 100
        start = time.time()
        subprocess.run(
            ["dd", "if=/dev/zero", f"of={test_file}", "bs=1M", f"count={size_mb}", "oflag=direct"],
            capture_output=True, check=True, timeout=30,
        )
        elapsed = time.time() - start
        storage_speed = round(size_mb / elapsed, 1) if elapsed > 0 else 0
        subprocess.run(["rm", "-f", test_file], check=False, timeout=5)
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    storage_ok = storage_speed >= 100
    results["storage_speed_mbps"] = storage_speed
    results["storage_ok"] = storage_ok
    if not storage_ok:
        all_passed = False
    log.info("[%s] Storage: %.1f MB/s (need >= 100 MB/s)", "PASS" if storage_ok else "FAIL", storage_speed)

    # Summary
    log.info("=" * 60)
    log.info("SELF-TEST RESULT: %s", "ALL PASSED" if all_passed else "SOME CHECKS FAILED")
    log.info("=" * 60)

    # Report to Supabase
    payload = {
        "self_test_passed": all_passed,
        "self_test_at": datetime.now(timezone.utc).isoformat(),
        "cuda_version": cuda,
        "inet_down_mbps": net_speed,
        "inet_up_mbps": net_up,
        "pcie_bandwidth_gbps": pcie_gbps,
        "dlperf_score": dlperf,
    }
    try:
        res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}",
            headers=_supabase_headers(content_type=True),
            json=payload,
            timeout=15,
        )
        if res.status_code < 400:
            log.info("Self-test results reported to Velocity Infra.")
        else:
            log.error("Failed to report self-test: %s", res.text)
    except requests.RequestException as exc:
        log.error("Network error reporting self-test: %s", exc)

    return all_passed

# ---------------------------------------------------------------------------
# Configuration file support (~/.velocity/machine.json)
# ---------------------------------------------------------------------------

VELOCITY_CONFIG_DIR = Path.home() / ".velocity"
VELOCITY_CONFIG_FILE = VELOCITY_CONFIG_DIR / "machine.json"


def load_config():
    """Load machine config from ~/.velocity/machine.json, returning dict or None."""
    if VELOCITY_CONFIG_FILE.exists():
        try:
            with open(VELOCITY_CONFIG_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as exc:
            log.warning("Failed to read config file: %s", exc)
    return None


def save_config(config):
    """Write machine config to ~/.velocity/machine.json."""
    VELOCITY_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(VELOCITY_CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    os.chmod(VELOCITY_CONFIG_FILE, 0o600)
    log.info("Config saved to %s", VELOCITY_CONFIG_FILE)


def detect_gpu_info():
    """Detect GPU model, count, and VRAM from nvidia-smi."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, check=True, timeout=15,
        )
        lines = [ln.strip() for ln in result.stdout.splitlines() if ln.strip()]
        if not lines:
            return None, 0, 0
        first = lines[0].split(",")
        gpu_model = first[0].strip() if first else "Unknown GPU"
        vram_mb = int(first[1].strip()) if len(first) > 1 else 0
        vram_gb = round(vram_mb / 1024)
        return gpu_model, len(lines), vram_gb
    except (subprocess.SubprocessError, FileNotFoundError, ValueError):
        return None, 0, 0


def detect_docker_version():
    """Detect Docker version."""
    try:
        result = subprocess.run(
            ["docker", "version", "--format", "{{.Server.Version}}"],
            capture_output=True, text=True, check=True, timeout=10,
        )
        return result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError):
        return None


def detect_os_info():
    """Detect OS name and version."""
    try:
        result = subprocess.run(
            ["lsb_release", "-ds"],
            capture_output=True, text=True, check=True, timeout=5,
        )
        return result.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError):
        import platform
        return f"{platform.system()} {platform.release()}"


def register_machine(api_key, api_url=None, test_mode=False):
    """Detect hardware and register with the Velocity Infra API. Returns machine_id."""
    base_url = api_url or os.getenv("VELOCITY_API_URL", "https://velocity-infra.vercel.app")

    log.info("Detecting hardware...")

    if test_mode:
        log.info("TEST MODE: Using simulated hardware specs")
        gpu_model = "NVIDIA RTX 4090 (simulated)"
        gpu_count = 1
        vram_gb = 24
        ram_gb = round(psutil.virtual_memory().total / (1024 ** 3), 1)
        vcpu_count = psutil.cpu_count(logical=True) or 1
        disk = psutil.disk_usage("/")
        storage_gb = round(disk.total / (1024 ** 3))
        cuda_ver = "12.2 (simulated)"
        docker_ver = "24.0 (simulated)"
        os_info = f"{sys.platform} (test mode)"
    else:
        gpu_model, gpu_count, vram_gb = detect_gpu_info()
        if not gpu_model:
            log.error("No NVIDIA GPU detected. Ensure nvidia-smi is available.")
            sys.exit(1)

        stats = get_system_stats()
        cuda_ver = get_cuda_version()
        docker_ver = detect_docker_version()
        os_info = detect_os_info()

        ram_gb = stats.get("ram_total_gb", 0)
        vcpu_count = psutil.cpu_count(logical=True) or 1
        disk = psutil.disk_usage("/")
        storage_gb = round(disk.total / (1024 ** 3))

    try:
        public_ip = requests.get("https://api.ipify.org", timeout=5).text.strip()
    except requests.RequestException:
        public_ip = "unknown"

    payload = {
        "gpu_model": gpu_model,
        "gpu_count": gpu_count,
        "vram_gb": vram_gb,
        "ram_gb": ram_gb,
        "vcpu_count": vcpu_count,
        "storage_gb": storage_gb,
        "os": os_info,
        "cuda_version": cuda_ver,
        "docker_version": docker_ver,
        "public_ip": public_ip,
    }

    log.info("Hardware detected:")
    log.info("  GPU: %dx %s (%d GB VRAM)", gpu_count, gpu_model, vram_gb)
    log.info("  RAM: %.1f GB, vCPUs: %d, Storage: %d GB", ram_gb, vcpu_count, storage_gb)
    log.info("  CUDA: %s, Docker: %s, OS: %s", cuda_ver, docker_ver, os_info)
    log.info("  Public IP: %s", public_ip)
    log.info("Registering with %s/api/host/machines ...", base_url)

    try:
        res = requests.post(
            f"{base_url}/api/host/machines",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        if res.status_code == 201:
            data = res.json()
            machine_id = data["machine_id"]
            log.info("Machine registered: %s", machine_id)
            log.info("Message: %s", data.get("message", ""))

            supabase_key = data.get("supabase_service_key", "").strip()
            config = {
                "machine_id": machine_id,
                "api_key": api_key,
                "supabase_url": data.get("supabase_url", SUPABASE_URL).strip(),
                "supabase_key": supabase_key,
                "api_url": base_url,
                "registered_at": datetime.now(timezone.utc).isoformat(),
            }
            save_config(config)
            return machine_id
        else:
            log.error("Registration failed (%d): %s", res.status_code, res.text)
            sys.exit(1)
    except requests.RequestException as exc:
        log.error("Network error during registration: %s", exc)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    AGENT_TEST_MODE = "--test-mode" in sys.argv

    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        log.info("Running self-test for machine %s", MACHINE_ID)
        passed = run_self_test()
        sys.exit(0 if passed else 1)

    if len(sys.argv) > 1 and sys.argv[1] == "--register":
        api_key = None
        api_url = None
        for i, arg in enumerate(sys.argv[2:], start=2):
            if arg == "--api-key" and i + 1 < len(sys.argv):
                api_key = sys.argv[i + 1]
            elif arg == "--api-url" and i + 1 < len(sys.argv):
                api_url = sys.argv[i + 1]
        if not api_key:
            api_key = os.getenv("VELOCITY_API_KEY", "")
        if not api_key:
            log.error("API key required. Use --api-key <key> or set VELOCITY_API_KEY env var.")
            sys.exit(1)
        register_machine(api_key, api_url, test_mode=AGENT_TEST_MODE)
        sys.exit(0)

    # Load config from file if env vars aren't explicitly set
    if not MACHINE_ID:
        config = load_config()
        if config:
            MACHINE_ID = config.get("machine_id", MACHINE_ID).strip()
            if "supabase_url" in config:
                SUPABASE_URL = config["supabase_url"].strip()
            if not SUPABASE_KEY:
                SUPABASE_KEY = config.get("supabase_key", config.get("api_key", "")).strip()
            log.info("Loaded config from %s (machine: %s)", VELOCITY_CONFIG_FILE, MACHINE_ID)
        else:
            log.error("No MACHINE_ID set and no config file found. Run --register first or set MACHINE_ID env var.")
            sys.exit(1)

    log.info("Velocity Infra Host Agent %s starting for machine %s", AGENT_VERSION, MACHINE_ID)

    if AGENT_TEST_MODE:
        log.info("TEST MODE active — Docker/GPU operations are simulated")
    else:
        ensure_docker_network()

    last_heartbeat = 0
    last_monitor = 0
    last_net_test = 0
    cached_net_speed = 0

    while True:
        try:
            now = time.time()

            if not AGENT_TEST_MODE and now - last_net_test >= 1800:
                cached_net_speed = estimate_network_speed()
                cached_net_up = estimate_network_upload_mbps()
                try:
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/machines?id=eq.{MACHINE_ID}",
                        headers=_supabase_headers(content_type=True),
                        json={
                            "inet_down_mbps": cached_net_speed,
                            "inet_up_mbps": cached_net_up,
                        },
                        timeout=15,
                    )
                except requests.RequestException:
                    pass
                last_net_test = now

            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                heartbeat()
                last_heartbeat = now

            if not AGENT_TEST_MODE:
                check_for_jobs()
                check_maintenance()

                if now - last_monitor >= MONITOR_INTERVAL:
                    monitor_running_containers()
                    last_monitor = now

        except Exception as exc:
            log.error("Agent loop error: %s", exc)

        time.sleep(POLL_INTERVAL)
