"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/currency";

const GPU_DATA = [
  { id: "rtx4090", name: "RTX 4090", velocity: 0.45, aws: 1.50, gcp: 1.40, azure: 1.60 },
  { id: "a100", name: "A100 (80GB)", velocity: 1.45, aws: 4.10, gcp: 3.90, azure: 4.20 },
  { id: "h100", name: "H100 SXM5", velocity: 2.65, aws: 8.50, gcp: 8.20, azure: 8.80 },
];

export function PriceCalculator() {
  const [selectedGpu, setSelectedGpu] = useState(GPU_DATA[0]);

  const maxPrice = Math.max(selectedGpu.aws, selectedGpu.gcp, selectedGpu.azure);

  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-6 md:p-8 max-w-4xl mx-auto shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">Compare Pricing</h3>
          <p className="text-[#94A3B8] text-sm mt-1">See how Velocity Infra stacks up</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/[0.06]">
          {GPU_DATA.map((gpu) => (
            <button
              key={gpu.id}
              onClick={() => setSelectedGpu(gpu)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedGpu.id === gpu.id
                  ? "bg-gradient-to-r from-primary-dark to-primary text-white shadow-lg"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              {gpu.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-bold text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Velocity Infra
            </span>
            <span className="font-mono font-bold text-primary">{formatUSD(selectedGpu.velocity, { suffix: '/hr' })}</span>
          </div>
          <div className="h-8 bg-white/5 rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(selectedGpu.velocity / maxPrice) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="relative">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-[#E2E8F0]">AWS</span>
            <span className="font-mono text-[#94A3B8]">{formatUSD(selectedGpu.aws, { suffix: '/hr' })}</span>
          </div>
          <div className="h-6 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500/50 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(selectedGpu.aws / maxPrice) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="relative">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-[#E2E8F0]">Google Cloud</span>
            <span className="font-mono text-[#94A3B8]">{formatUSD(selectedGpu.gcp, { suffix: '/hr' })}</span>
          </div>
          <div className="h-6 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500/50 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(selectedGpu.gcp / maxPrice) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="relative">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-[#E2E8F0]">Azure</span>
            <span className="font-mono text-[#94A3B8]">{formatUSD(selectedGpu.azure, { suffix: '/hr' })}</span>
          </div>
          <div className="h-6 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400/50 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(selectedGpu.azure / maxPrice) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
        <p className="text-lg font-medium text-white">
          Save up to <span className="text-primary font-bold text-xl">{Math.round((1 - selectedGpu.velocity / maxPrice) * 100)}%</span> on compute costs
        </p>
      </div>
    </div>
  );
}
