import os
import time
import asyncio
import logging
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pyworker")

app = FastAPI(title="Velocity PyWorker")

# Configuration from environment variables
MODEL_HOST = os.getenv("MODEL_HOST", "localhost")
MODEL_PORT = int(os.getenv("MODEL_PORT", "8000"))
MODEL_URL = f"http://{MODEL_HOST}:{MODEL_PORT}"

ENGINE_URL = os.getenv("ENGINE_URL", "http://localhost:3000/api/serverless")
WORKER_ID = os.getenv("WORKER_ID", "local-dev-worker")
AUTH_SECRET = os.getenv("AUTH_SECRET", "dev-secret")

# Metrics state
metrics = {
    "current_load": 0.0,
    "queue_time": 0.0,
    "perf_rating": 100.0,
    "state": "active",
    "requests_processed": 0,
    "total_latency_ms": 0
}

# Concurrency tracking
active_requests = 0
request_queue = []

class GenerateRequest(BaseModel):
    auth_data: Dict[str, Any]
    payload: Dict[str, Any]

async def verify_auth(auth_data: Dict[str, Any]):
    """Verify the signature from the Serverless Engine."""
    signature = auth_data.get("signature")
    request_id = auth_data.get("request_id")
    endpoint_id = auth_data.get("endpoint_id")
    
    if not signature or not request_id or not endpoint_id:
        raise HTTPException(status_code=401, detail="Missing auth data")
        
    # In production, this would use a proper HMAC verification
    # For now, we just check if it matches the expected format
    import base64
    try:
        decoded = base64.b64decode(signature).decode('utf-8')
        parts = decoded.split(':')
        if len(parts) != 3 or parts[0] != request_id or parts[1] != WORKER_ID:
            raise HTTPException(status_code=401, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid signature format")

@app.post("/generate")
async def generate(request: GenerateRequest):
    """Proxy request to the underlying model."""
    global active_requests, metrics
    
    # Verify authentication
    await verify_auth(request.auth_data)
    
    # Track metrics
    active_requests += 1
    metrics["current_load"] = float(active_requests)
    start_time = time.time()
    
    try:
        # Forward the payload to the model
        async with httpx.AsyncClient(timeout=120.0) as client:
            model_endpoint = f"{MODEL_URL}/generate" # Adjust based on actual model API
            
            # For vLLM, it might be /v1/completions or /generate
            # We'll assume a generic /generate endpoint for now
            response = await client.post(model_endpoint, json=request.payload)
            
            # Check if successful
            response.raise_for_status()
            
            # Update metrics
            latency_ms = int((time.time() - start_time) * 1000)
            metrics["requests_processed"] += 1
            metrics["total_latency_ms"] += latency_ms
            
            # Calculate average queue time (simplified)
            metrics["queue_time"] = metrics["total_latency_ms"] / metrics["requests_processed"] / 1000.0
            
            return response.json()
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Model returned error: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to model: {e}")
        raise HTTPException(status_code=502, detail="Model unavailable")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        active_requests -= 1
        metrics["current_load"] = float(active_requests)

@app.get("/health")
async def health():
    """Readiness check."""
    try:
        # Check if the model is reachable
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{MODEL_URL}/health") # Adjust based on actual model API
            if response.status_code == 200:
                return {"status": "ready", "model": "reachable"}
    except Exception:
        pass
        
    return {"status": "starting", "model": "unreachable"}

async def report_metrics_loop():
    """Background task to report metrics to the Serverless Engine."""
    while True:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                payload = {
                    "current_load": metrics["current_load"],
                    "queue_time": metrics["queue_time"],
                    "perf_rating": metrics["perf_rating"],
                    "state": metrics["state"],
                    "auth_secret": AUTH_SECRET
                }
                
                response = await client.post(
                    f"{ENGINE_URL}/workers/{WORKER_ID}/metrics",
                    json=payload
                )
                
                if response.status_code != 200:
                    logger.warning(f"Failed to report metrics: {response.status_code} {response.text}")
                else:
                    logger.debug("Successfully reported metrics")
                    
        except Exception as e:
            logger.error(f"Error reporting metrics: {e}")
            
        # Sleep for 5 seconds before next report
        await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    """Start the metrics reporting loop on startup."""
    asyncio.create_task(report_metrics_loop())
    logger.info(f"Started PyWorker for worker {WORKER_ID}, proxying to {MODEL_URL}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)