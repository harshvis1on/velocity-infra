'use client';

import { useEffect, useState, useRef } from 'react';

interface Line {
  text: string;
  color?: string;
  delay: number;
  isCommand?: boolean;
}

const LINES: Line[] = [
  { text: '$ velocity deploy --gpu A100 --template pytorch', delay: 0, isCommand: true },
  { text: '', delay: 300 },
  { text: '  Searching marketplace for cheapest A100...', color: 'text-gray-500', delay: 600 },
  { text: '', delay: 200 },
  { text: '  Provider #1   A100 80GB   ₹152/hr', color: 'text-gray-600', delay: 300 },
  { text: '  Provider #2   A100 80GB   ₹148/hr', color: 'text-gray-600', delay: 200 },
  { text: '  Provider #3   A100 80GB   ₹155/hr', color: 'text-gray-600', delay: 200 },
  { text: '  → Best price: ₹148/hr (62% cheaper than AWS)', color: 'text-primary', delay: 400 },
  { text: '', delay: 300 },
  { text: '  Provisioning instance... ready in 18s', color: 'text-gray-500', delay: 800 },
  { text: '  Installing PyTorch 2.3 + CUDA 12.4...done', color: 'text-gray-500', delay: 600 },
  { text: '', delay: 200 },
  { text: '  ✓ Instance gpu-7x2k is running', color: 'text-primary', delay: 400 },
  { text: '    SSH:     ssh root@gpu-7x2k.velocity.run', color: 'text-white', delay: 300 },
  { text: '    Jupyter: https://gpu-7x2k.velocity.run:8888', color: 'text-white', delay: 300 },
  { text: '', delay: 500 },
  { text: '$ velocity ssh gpu-7x2k', delay: 400, isCommand: true },
  { text: '', delay: 300 },
  { text: '  Connected to gpu-7x2k (NVIDIA A100 80GB)', color: 'text-gray-500', delay: 400 },
  { text: '', delay: 200 },
  { text: 'root@gpu-7x2k:~$ python train.py --epochs 10', color: 'text-white', delay: 300 },
  { text: '', delay: 200 },
  { text: '  Epoch 1/10  loss=2.34  ████░░░░░░', color: 'text-gray-400', delay: 500 },
  { text: '  Epoch 2/10  loss=1.87  ████████░░', color: 'text-gray-400', delay: 400 },
  { text: '  Epoch 3/10  loss=1.42  ██████████', color: 'text-gray-400', delay: 400 },
  { text: '  ...', color: 'text-gray-600', delay: 300 },
  { text: '  Epoch 10/10 loss=0.31  ██████████', color: 'text-gray-400', delay: 400 },
  { text: '', delay: 300 },
  { text: '  ✓ Training complete in 2h 8m', color: 'text-primary', delay: 400 },
  { text: '  ✓ Cost: ₹316 (saved ₹514 vs AWS)', color: 'text-primary', delay: 300 },
  { text: '', delay: 400 },
  { text: '  💡 Share your savings → velocity.run/s/a3kx9', color: 'text-yellow-400', delay: 500 },
];

export default function HeroTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [typingIndex, setTypingIndex] = useState(-1);
  const [currentTyped, setCurrentTyped] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let totalDelay = 600;
    const timers: ReturnType<typeof setTimeout>[] = [];

    LINES.forEach((line, i) => {
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
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines, currentTyped]);

  return (
    <div className="relative group">
      <div className="absolute -inset-[1px] bg-gradient-to-b from-primary/20 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative bg-[#0a0a0a] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[11px] font-mono text-gray-600">~/my-project</span>
          <div className="w-14" />
        </div>
        <div
          ref={containerRef}
          className="px-5 py-4 font-mono text-[12px] leading-[1.7] h-[440px] overflow-y-auto scrollbar-none"
        >
          {LINES.slice(0, visibleLines).map((line, i) => {
            if (line.isCommand) {
              return (
                <div key={i} className="text-white font-medium">
                  <span className="text-primary/60">$ </span>
                  <span>{line.text.slice(2)}</span>
                </div>
              );
            }
            if (!line.text) return <div key={i} className="h-2" />;
            return (
              <div key={i} className={line.color || 'text-gray-300'}>
                {line.text}
              </div>
            );
          })}
          {typingIndex >= 0 && typingIndex < LINES.length && LINES[typingIndex].isCommand && (
            <div className="text-white font-medium">
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
