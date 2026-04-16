'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { formatUSD } from '@/lib/currency';

interface Line {
  text: string;
  color?: string;
  delay: number;
  isCommand?: boolean;
}

export default function HeroTerminal() {
  const lines: Line[] = useMemo(() => [
    { text: '$ velocity deploy --gpu A100 --template pytorch', delay: 0, isCommand: true },
    { text: '', delay: 300 },
    { text: '  Searching marketplace for cheapest A100...', color: 'text-[#64748B]', delay: 600 },
    { text: '', delay: 200 },
    { text: `  Provider #1   A100 80GB   ${formatUSD(1.85, { suffix: '/hr' })}`, color: 'text-[#475569]', delay: 300 },
    { text: `  Provider #2   A100 80GB   ${formatUSD(1.80, { suffix: '/hr' })}`, color: 'text-[#475569]', delay: 200 },
    { text: `  Provider #3   A100 80GB   ${formatUSD(1.90, { suffix: '/hr' })}`, color: 'text-[#475569]', delay: 200 },
    { text: `  → Best price: ${formatUSD(1.80, { suffix: '/hr' })} (62% cheaper than AWS)`, color: 'text-primary', delay: 400 },
    { text: '', delay: 300 },
    { text: '  Provisioning instance... ready in 18s', color: 'text-[#64748B]', delay: 800 },
    { text: '  Installing PyTorch 2.3 + CUDA 12.4...done', color: 'text-[#64748B]', delay: 600 },
    { text: '', delay: 200 },
    { text: '  ✓ Instance gpu-7x2k is running', color: 'text-primary', delay: 400 },
    { text: '    SSH:     ssh root@gpu-7x2k.velocity.run', color: 'text-[#E2E8F0]', delay: 300 },
    { text: '    Jupyter: https://gpu-7x2k.velocity.run:8888', color: 'text-[#E2E8F0]', delay: 300 },
    { text: '', delay: 500 },
    { text: '$ velocity ssh gpu-7x2k', delay: 400, isCommand: true },
    { text: '', delay: 300 },
    { text: '  Connected to gpu-7x2k (NVIDIA A100 80GB)', color: 'text-[#64748B]', delay: 400 },
    { text: '', delay: 200 },
    { text: 'root@gpu-7x2k:~$ python train.py --epochs 10', color: 'text-[#E2E8F0]', delay: 300 },
    { text: '', delay: 200 },
    { text: '  Epoch 1/10  loss=2.34  ████░░░░░░', color: 'text-[#94A3B8]', delay: 500 },
    { text: '  Epoch 2/10  loss=1.87  ████████░░', color: 'text-[#94A3B8]', delay: 400 },
    { text: '  Epoch 3/10  loss=1.42  ██████████', color: 'text-[#94A3B8]', delay: 400 },
    { text: '  ...', color: 'text-[#475569]', delay: 300 },
    { text: '  Epoch 10/10 loss=0.31  ██████████', color: 'text-[#94A3B8]', delay: 400 },
    { text: '', delay: 300 },
    { text: '  ✓ Training complete in 2h 8m', color: 'text-primary', delay: 400 },
    { text: `  ✓ Cost: ${formatUSD(3.85)} (saved ${formatUSD(6.25)} vs AWS)`, color: 'text-primary', delay: 300 },
    { text: '', delay: 400 },
    { text: '  💡 Share your savings → velocity.run/s/a3kx9', color: 'text-amber-400', delay: 500 },
  ], []);
  const [visibleLines, setVisibleLines] = useState(0);
  const [typingIndex, setTypingIndex] = useState(-1);
  const [currentTyped, setCurrentTyped] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleLines(0);
    setTypingIndex(-1);
    setCurrentTyped('');

    let totalDelay = 600;
    const timers: ReturnType<typeof setTimeout>[] = [];

    lines.forEach((line, i) => {
      totalDelay += line.delay;

      if (line.isCommand) {
        const text = line.text;
        timers.push(setTimeout(() => {
          setTypingIndex(i);
          setCurrentTyped('');
          setVisibleLines(i);
        }, totalDelay));

        for (let c = 0; c < text.length; c++) {
          totalDelay += 18 + Math.random() * 12;
          timers.push(setTimeout(() => {
            setCurrentTyped(text.slice(0, c + 1));
          }, totalDelay));
        }

        totalDelay += 250;
        timers.push(setTimeout(() => {
          setVisibleLines(i + 1);
          setTypingIndex(-1);
        }, totalDelay));
      } else {
        timers.push(setTimeout(() => {
          setVisibleLines(i + 1);
        }, totalDelay));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [lines]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines, currentTyped]);

  return (
    <div className="relative group">
      <div className="absolute -inset-[1px] bg-gradient-to-b from-primary/20 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative bg-[#080D16] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 bg-white/[0.02]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[11px] font-mono text-[#475569]">~/my-project</span>
          <div className="w-14" />
        </div>
        <div
          ref={containerRef}
          className="px-5 py-4 font-mono text-[12px] leading-[1.7] h-[440px] overflow-y-auto scrollbar-none"
        >
          {lines.slice(0, visibleLines).map((line, i) => {
            if (line.isCommand) {
              return (
                <div key={i} className="text-[#E2E8F0] font-medium">
                  <span className="text-primary/60">$ </span>
                  <span>{line.text.slice(2)}</span>
                </div>
              );
            }
            if (!line.text) return <div key={i} className="h-2" />;
            return (
              <div key={i} className={line.color || 'text-[#94A3B8]'}>
                {line.text}
              </div>
            );
          })}
          {typingIndex >= 0 && typingIndex < lines.length && lines[typingIndex].isCommand && (
            <div className="text-[#E2E8F0] font-medium">
              <span className="text-primary/60">$ </span>
              <span>{currentTyped.slice(2)}</span>
              <span className="inline-block w-[7px] h-[15px] bg-primary/70 animate-pulse ml-[1px] align-middle" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
