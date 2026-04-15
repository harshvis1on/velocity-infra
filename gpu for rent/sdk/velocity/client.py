import os
import time
import requests
import httpx
from typing import Dict, Any, Optional, List


class Instance:
    """Represents a GPU instance on Velocity Infra."""

    def __init__(self, data: Dict[str, Any], client: "Velocity"):
        self._client = client
        self.id: str = data.get("id", "")
        self.status: str = data.get("status", "unknown")
        self.gpu_model: str = data.get("machines", {}).get("gpu_model", "") if data.get("machines") else ""
        self.gpu_count: int = data.get("gpu_count", 1)
        self.gpu_indices: List[int] = data.get("gpu_indices", [])
        self.launch_mode: str = data.get("launch_mode", "ssh")
        self.rental_type: str = data.get("rental_type", "on_demand")
        self.tunnel_url: Optional[str] = data.get("tunnel_url")
        self.host_port: Optional[int] = data.get("host_port")
        self.public_ip: Optional[str] = data.get("machines", {}).get("public_ip") if data.get("machines") else None
        self._raw = data

    @property
    def ssh_command(self) -> Optional[str]:
        if self.tunnel_url:
            host = self.tunnel_url.replace("https://", "").replace("http://", "")
            return f"ssh -o StrictHostKeyChecking=no root@{host} -p 443"
        if self.public_ip and self.host_port:
            return f"ssh -o StrictHostKeyChecking=no root@{self.public_ip} -p {self.host_port}"
        return None

    def pause(self) -> "Instance":
        return self._client._instance_action(self.id, "pause")

    def resume(self) -> "Instance":
        return self._client._instance_action(self.id, "resume")

    def destroy(self) -> "Instance":
        return self._client._instance_action(self.id, "destroy")

    def refresh(self) -> "Instance":
        instances = self._client.list_instances()
        for inst in instances:
            if inst.id == self.id:
                self.__dict__.update(inst.__dict__)
                return self
        return self

    def __repr__(self) -> str:
        return f"Instance(id='{self.id[:8]}', status='{self.status}', gpu='{self.gpu_count}x {self.gpu_model}')"


class Offer:
    """Represents a GPU offer on the marketplace."""

    def __init__(self, data: Dict[str, Any]):
        self.id: str = data.get("id", "")
        self.price_per_gpu_hr: float = data.get("price_per_gpu_hr_inr", 0)
        self.min_gpu: int = data.get("min_gpu", 1)
        self.gpu_model: str = data.get("machines", {}).get("gpu_model", "") if data.get("machines") else ""
        self.gpu_count: int = data.get("machines", {}).get("gpu_count", 0) if data.get("machines") else 0
        self.gpu_available: int = self.gpu_count - (data.get("machines", {}).get("gpu_allocated", 0) if data.get("machines") else 0)
        self.vram_gb: int = data.get("machines", {}).get("vram_gb", 0) if data.get("machines") else 0
        self.tier: str = data.get("machines", {}).get("machine_tier", "unverified") if data.get("machines") else "unverified"
        self.reliability: float = data.get("machines", {}).get("reliability_score", 0) if data.get("machines") else 0
        self.interruptible_min_price: Optional[float] = data.get("interruptible_min_price_inr")
        self._raw = data

    def __repr__(self) -> str:
        return f"Offer(id='{self.id[:8]}', gpu='{self.gpu_count}x {self.gpu_model}', price=₹{self.price_per_gpu_hr}/hr)"


class Velocity:
    """
    Velocity Infra Python SDK.

    Usage:
        from velocity import Velocity

        v = Velocity(api_key="vi_live_...")

        # Search and rent
        offers = v.search_offers(gpu="A100", max_price=150)
        instance = v.create_instance(gpu="H100", template="pytorch")

        # Manage lifecycle
        instance.pause()
        instance.resume()
        instance.destroy()

        # List instances
        instances = v.list_instances()
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://velocity-infra.vercel.app",
    ):
        self.api_key = api_key or os.getenv("VELOCITY_API_KEY")
        self.base_url = base_url.rstrip("/")

        if not self.api_key:
            raise ValueError("api_key is required (or set VELOCITY_API_KEY env var)")

        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Velocity-Key": "true",
        })

    def _api(self, method: str, path: str, **kwargs) -> requests.Response:
        url = f"{self.base_url}{path}"
        resp = self._session.request(method, url, **kwargs)
        resp.raise_for_status()
        return resp

    def _validate_key(self) -> Dict[str, Any]:
        resp = self._api("POST", "/api/keys/validate")
        data = resp.json()
        if not data.get("valid"):
            raise PermissionError("Invalid API key")
        return data

    # ── Instance lifecycle ───────────────────────────────────────────

    def create_instance(
        self,
        gpu: str = "RTX 4090",
        template: str = "pytorch",
        gpu_count: int = 1,
        disk_gb: int = 50,
        rental_type: str = "on_demand",
        max_price: Optional[float] = None,
        offer_id: Optional[str] = None,
    ) -> Instance:
        """Create a new GPU instance.

        Args:
            gpu: GPU model to search for (e.g. "H100", "A100", "RTX 4090").
            template: Template name (e.g. "pytorch", "vllm", "comfyui").
            gpu_count: Number of GPUs to rent.
            disk_gb: Disk size in GB.
            rental_type: "on_demand", "reserved", or "interruptible".
            max_price: Maximum price per GPU/hr in INR (for auto-selecting offers).
            offer_id: Specific offer ID to rent from (skips auto-selection).
        """
        if not offer_id:
            offers = self.search_offers(gpu=gpu, max_price=max_price, min_gpu=gpu_count)
            if not offers:
                raise ValueError(f"No offers found for {gpu} with {gpu_count} GPUs available")
            offers.sort(key=lambda o: o.price_per_gpu_hr)
            offer_id = offers[0].id

        resp = self._api("POST", "/api/console/rent", json={
            "offerId": offer_id,
            "gpuCount": gpu_count,
            "templateName": template,
            "diskSize": disk_gb,
            "launchMode": "ssh",
            "rentalType": rental_type,
        })
        result = resp.json()
        instance_data = result.get("instance", result)
        return Instance(instance_data, self)

    def list_instances(self, status: Optional[str] = None) -> List[Instance]:
        """List your instances. Optionally filter by status."""
        resp = self._api("GET", "/api/console/instances", params={"status": status} if status else {})
        data = resp.json()
        items = data if isinstance(data, list) else data.get("instances", [])
        return [Instance(d, self) for d in items]

    def get_instance(self, instance_id: str) -> Instance:
        """Get a single instance by ID."""
        resp = self._api("GET", f"/api/console/instances/{instance_id}")
        return Instance(resp.json(), self)

    def _instance_action(self, instance_id: str, action: str) -> Instance:
        resp = self._api("POST", f"/api/console/instances/{instance_id}/{action}")
        return Instance(resp.json(), self)

    # ── Offer search ─────────────────────────────────────────────────

    def search_offers(
        self,
        gpu: Optional[str] = None,
        max_price: Optional[float] = None,
        min_gpu: Optional[int] = None,
        verified_only: bool = False,
    ) -> List[Offer]:
        """Search the GPU marketplace for available offers.

        Args:
            gpu: Filter by GPU model name (substring match).
            max_price: Maximum price per GPU/hr in INR.
            min_gpu: Minimum available GPU count.
            verified_only: Only return verified or secure_cloud machines.
        """
        params: Dict[str, Any] = {}
        if gpu:
            params["gpu"] = gpu
        if max_price is not None:
            params["max_price"] = max_price
        if min_gpu is not None:
            params["min_gpu"] = min_gpu
        if verified_only:
            params["verified"] = "true"

        resp = self._api("GET", "/api/console/offers", params=params)
        data = resp.json()
        items = data if isinstance(data, list) else data.get("offers", [])
        return [Offer(d) for d in items]

    # ── Wallet ───────────────────────────────────────────────────────

    def get_balance(self) -> float:
        """Get current wallet balance in INR."""
        resp = self._api("GET", "/api/billing/balance")
        return resp.json().get("balance_inr", 0)

    # ── Templates ────────────────────────────────────────────────────

    def list_templates(self) -> List[Dict[str, Any]]:
        """List all available deployment templates."""
        resp = self._api("GET", "/api/templates")
        data = resp.json()
        return data if isinstance(data, list) else data.get("templates", [])

    # ── Async methods ────────────────────────────────────────────────

    async def create_instance_async(self, **kwargs) -> Instance:
        """Async version of create_instance."""
        async with httpx.AsyncClient() as client:
            headers = dict(self._session.headers)

            if not kwargs.get("offer_id"):
                offers = self.search_offers(
                    gpu=kwargs.get("gpu", "RTX 4090"),
                    max_price=kwargs.get("max_price"),
                    min_gpu=kwargs.get("gpu_count", 1),
                )
                if not offers:
                    raise ValueError("No offers found")
                offers.sort(key=lambda o: o.price_per_gpu_hr)
                kwargs["offer_id"] = offers[0].id

            resp = await client.post(
                f"{self.base_url}/api/console/rent",
                headers=headers,
                json={
                    "offerId": kwargs["offer_id"],
                    "gpuCount": kwargs.get("gpu_count", 1),
                    "templateName": kwargs.get("template", "pytorch"),
                    "diskSize": kwargs.get("disk_gb", 50),
                    "launchMode": "ssh",
                    "rentalType": kwargs.get("rental_type", "on_demand"),
                },
            )
            resp.raise_for_status()
            result = resp.json()
            return Instance(result.get("instance", result), self)

    async def list_instances_async(self, status: Optional[str] = None) -> List[Instance]:
        """Async version of list_instances."""
        async with httpx.AsyncClient() as client:
            headers = dict(self._session.headers)
            params = {"status": status} if status else {}
            resp = await client.get(f"{self.base_url}/api/console/instances", headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else data.get("instances", [])
            return [Instance(d, self) for d in items]


# Backward compatibility
VelocityClient = Velocity
