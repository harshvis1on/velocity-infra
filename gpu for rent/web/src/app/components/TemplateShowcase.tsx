"use client";

import { useState } from "react";
import Link from "next/link";
import { formatUSD } from "@/lib/currency";

const TEMPLATES = [
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    description: "DeepSeek V3 671B MoE via vLLM. OpenAI-compatible API. Best open-source LLM for reasoning and code.",
    dockerImage: "vllm/vllm-openai:latest",
    bootTime: "< 40s",
    startPriceUsd: 1.45,
    tag: "NEW",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
    )
  },
  {
    id: "flux-dev",
    name: "FLUX.2 Dev",
    description: "State-of-the-art text-to-image from Black Forest Labs. 12B params, photorealistic quality, prompt adherence.",
    dockerImage: "ghcr.io/black-forest-labs/flux:dev",
    bootTime: "< 30s",
    startPriceUsd: 0.45,
    tag: "NEW",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )
  },
  {
    id: "vllm",
    name: "vLLM (OpenAI API)",
    description: "High-throughput LLM inference engine. OpenAI API compatible. Serve Llama 3, Mistral, Qwen, and more.",
    dockerImage: "vllm/vllm-openai:latest",
    bootTime: "< 25s",
    startPriceUsd: 0.18,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    )
  },
  {
    id: "ltx-video",
    name: "LTX-Video 2.3",
    description: "Text-to-video and image-to-video generation. High quality short video clips from text prompts.",
    dockerImage: "runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04",
    bootTime: "< 45s",
    startPriceUsd: 0.55,
    tag: "NEW",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
    )
  },
  {
    id: "comfyui",
    name: "ComfyUI",
    description: "Modular Stable Diffusion GUI with nodes interface. Ready to generate with SDXL and FLUX models.",
    dockerImage: "yanwk/comfyui-boot:latest",
    bootTime: "< 30s",
    startPriceUsd: 0.12,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
    )
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Run any open-source LLM — Llama 3, Mistral, Gemma, Phi. Easiest way to get started with local models.",
    dockerImage: "ollama/ollama:latest",
    bootTime: "< 15s",
    startPriceUsd: 0.12,
    tag: "NEW",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )
  }
];

export function TemplateShowcase() {
  const [activeTab, setActiveTab] = useState(TEMPLATES[0]);

  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl">
      <div className="flex flex-wrap border-b border-white/[0.06] bg-white/[0.02]">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => setActiveTab(template)}
            className={`flex items-center gap-2 py-3.5 px-5 text-sm font-medium transition-colors relative ${
              activeTab.id === template.id
                ? "bg-white/5 text-primary border-b-2 border-primary"
                : "text-[#94A3B8] hover:text-white hover:bg-white/5"
            }`}
          >
            {template.icon}
            <span className="hidden sm:inline">{template.name}</span>
            {'tag' in template && template.tag && (
              <span className="text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {template.tag}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-white">{activeTab.name}</h3>
            {'tag' in activeTab && activeTab.tag && (
              <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {activeTab.tag}
              </span>
            )}
          </div>
          <p className="text-[#94A3B8]">{activeTab.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#080D16] border border-white/[0.06] rounded-lg p-4">
            <div className="text-xs text-[#64748B] mb-1 uppercase tracking-wider">Docker Template</div>
            <div className="font-mono text-sm text-primary truncate">{activeTab.dockerImage}</div>
          </div>
          <div className="bg-[#080D16] border border-white/[0.06] rounded-lg p-4">
            <div className="text-xs text-[#64748B] mb-1 uppercase tracking-wider">Expected Boot Time</div>
            <div className="font-mono text-sm text-white">{activeTab.bootTime}</div>
          </div>
          <div className="bg-[#080D16] border border-white/[0.06] rounded-lg p-4">
            <div className="text-xs text-[#64748B] mb-1 uppercase tracking-wider">Starting Price</div>
            <div className="font-mono text-sm text-primary font-bold">{formatUSD(activeTab.startPriceUsd, { suffix: '/hr' })}</div>
          </div>
        </div>

        <Link
          href="/signup"
          className="w-full bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-3 px-8 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          Deploy {activeTab.name}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </Link>
      </div>
    </div>
  );
}
