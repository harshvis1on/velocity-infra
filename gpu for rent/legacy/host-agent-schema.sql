-- Run this in your Supabase SQL Editor to add Docker orchestration fields

-- 1. Add fields to rentals to track the Docker container
ALTER TABLE public.rentals 
ADD COLUMN IF NOT EXISTS docker_image TEXT,
ADD COLUMN IF NOT EXISTS container_id TEXT,
ADD COLUMN IF NOT EXISTS host_port INTEGER,
ADD COLUMN IF NOT EXISTS ssh_password TEXT;

-- 2. Add fields to machines to track their actual IP and connection status
ALTER TABLE public.machines
ADD COLUMN IF NOT EXISTS public_ip TEXT,
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daemon_version TEXT;

-- 3. Create a templates table (Optional, but good for a marketplace)
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    docker_image TEXT NOT NULL,
    icon TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert some default templates (like Vast/RunPod)
INSERT INTO public.templates (name, description, docker_image, icon, category)
VALUES 
('PyTorch 2.2.0', 'JupyterLab, PyTorch 2.2.0, CUDA 12.1, Python 3.10', 'runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04', '🔥', 'Deep Learning'),
('Stable Diffusion WebUI', 'Automatic1111 WebUI, pre-configured models', 'runpod/stable-diffusion:web-ui-1.0.0', '🎨', 'Generative AI'),
('Nvidia Isaac Sim', 'Physical AI & Robotics Simulation. Requires RTX 4090.', 'nvcr.io/nvidia/isaac-sim:2023.1.1', '🤖', 'Robotics'),
('Base Ubuntu 22.04', 'Clean Ubuntu 22.04 with NVIDIA drivers and CUDA.', 'nvidia/cuda:12.2.2-devel-ubuntu22.04', '🐧', 'Base OS')
ON CONFLICT DO NOTHING;
