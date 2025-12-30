'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  command: string;
}

const Terminal: React.FC<TerminalProps> = ({ command }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mx-auto max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5" aria-hidden="true">
            <div className="h-3 w-3 rounded-full bg-red-500/20 box-border border-red-500/50" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/20 box-border border-yellow-500/50" />
            <div className="h-3 w-3 rounded-full bg-green-500/20 box-border border-green-500/50" />
          </div>
          <div className="ml-4 flex items-center gap-2 rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-500 font-mono">
            <TerminalIcon className="w-3 h-3" aria-hidden="true" />
            bash
          </div>
        </div>
      </div>
      <div className="p-4 font-mono text-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-emerald-500" aria-hidden="true">➜</span>
            <span className="text-blue-400" aria-hidden="true">~</span>
            <code>{command}</code>
            <span className="h-4 w-2 animate-pulse bg-slate-500" aria-hidden="true" />
          </div>
          <button
            onClick={handleCopy}
            className="rounded p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
            aria-label={copied ? "Copied!" : `Copy command: ${command}`}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="mt-2 space-y-1 text-slate-500 opacity-50 select-none" aria-hidden="true">
          <div>[1/4] Resolving packages...</div>
          <div>[2/4] Fetching packages...</div>
          <div>[3/4] Linking dependencies...</div>
          <div>[4/4] Building fresh packages...</div>
          <div className="text-emerald-500">Done in 0.45s</div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
