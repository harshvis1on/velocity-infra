import type { Metadata } from 'next';
import { CodeBlock, StatusBadge } from '../shared';

export const metadata: Metadata = {
  title: 'Python SDK | Velocity Docs',
  description:
    'velocity-infra Python SDK: create, pause, resume, and destroy GPU instances. Search offers, manage your wallet, and deploy AI workloads from Python.',
};

export default function SdkDocsPage() {
  return (
    <article className="space-y-12 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Tools</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Python SDK</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="live" />
          <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
            Full instance lifecycle, marketplace search, and wallet management from Python.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Installation</h2>
        <CodeBlock>
          {`pip install velocity-infra`}
        </CodeBlock>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Quick start</h2>
        <CodeBlock>
          {`from velocity import Velocity

v = Velocity(api_key="vi_live_...")

# Search for available GPUs
offers = v.search_offers(gpu="A100", max_price=150)
print(offers)  # [Offer(id='a1b2c3d4', gpu='1x A100', price=₹120/hr)]

# Create an instance
instance = v.create_instance(
    gpu="H100",
    template="pytorch",
    gpu_count=1,
    disk_gb=50,
)
print(instance)       # Instance(id='e5f6g7h8', status='provisioning', gpu='1x H100')
print(instance.ssh_command)  # ssh root@h100-xxxx.velocity.run -p 443

# Manage lifecycle
instance.pause()      # Pause (stop billing, keep storage)
instance.resume()     # Resume from pause
instance.destroy()    # Destroy (release all resources)`}
        </CodeBlock>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Instance management</h2>
        <CodeBlock>
          {`# List all your instances
instances = v.list_instances()

# Filter by status
running = v.list_instances(status="running")

# Get a specific instance
inst = v.get_instance("e5f6g7h8-...")

# Refresh status
inst.refresh()`}
        </CodeBlock>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Marketplace search</h2>
        <CodeBlock>
          {`# Search with filters
offers = v.search_offers(
    gpu="RTX 4090",    # GPU model (substring match)
    max_price=50,      # Max ₹/GPU/hr
    min_gpu=2,         # Minimum GPUs available
    verified_only=True # Only verified hosts
)

# Auto-select cheapest when creating
instance = v.create_instance(gpu="A100", max_price=130)`}
        </CodeBlock>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Templates &amp; wallet</h2>
        <CodeBlock>
          {`# List available templates
templates = v.list_templates()

# Check wallet balance
balance = v.get_balance()
print(f"Balance: ₹{balance}")`}
        </CodeBlock>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Async support</h2>
        <CodeBlock>
          {`import asyncio
from velocity import Velocity

v = Velocity(api_key="vi_live_...")

async def main():
    instances = await v.list_instances_async()
    instance = await v.create_instance_async(gpu="H100", template="pytorch")

asyncio.run(main())`}
        </CodeBlock>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Environment variables</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500">
                <th className="py-3 pr-6 font-medium">Variable</th>
                <th className="py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-3 pr-6 font-mono text-primary">VELOCITY_API_KEY</td>
                <td className="py-3">Your API key (alternative to passing in constructor)</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 font-mono text-primary">VELOCITY_API_URL</td>
                <td className="py-3">Custom API base URL (defaults to production)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
