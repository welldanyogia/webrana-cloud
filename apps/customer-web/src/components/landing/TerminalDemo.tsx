"use client";

import { useEffect, useState, useRef } from 'react';

import { Card } from '@/components/ui/card';

const COMMANDS = [
  { text: "sudo apt update && sudo apt upgrade -y", output: "Hit:1 http://id.archive.ubuntu.com/ubuntu jammy InRelease\nReading package lists... Done\nBuilding dependency tree... Done\n0 upgraded, 0 newly installed, 0 to remove." },
  { text: "curl -fsSL https://get.docker.com | sh", output: "# Executing docker install script, commit: 93d24947\n+ sh -c apt-get update -qq >/dev/null\n+ sh -c DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce >/dev/null\nDocker installed successfully." },
  { text: "docker-compose up -d", output: "[+] Running 3/3\n ⠿ Network app_default  Created\n ⠿ Container db         Started\n ⠿ Container web        Started" },
  { text: "curl localhost:3000", output: "<!DOCTYPE html>\n<html>\n<head><title>Welcome to WeBrana</title></head>\n<body>\n  <h1>Deployed Successfully! 🚀</h1>\n</body>\n</html>" },
];

export function TerminalDemo() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [history, setHistory] = useState<{ cmd: string; out?: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lineIndex >= COMMANDS.length) {
        // Reset after delay
        const timeout = setTimeout(() => {
            setHistory([]);
            setLineIndex(0);
            setCharIndex(0);
        }, 5000);
        return () => clearTimeout(timeout);
    }

    const currentCommand = COMMANDS[lineIndex].text;

    if (charIndex < currentCommand.length) {
      const timeout = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, 50 + Math.random() * 50); // Typing speed
      return () => clearTimeout(timeout);
    } else {
      // Command finished typing, show output after delay
      const timeout = setTimeout(() => {
        setHistory((prev) => [...prev, { cmd: currentCommand, out: COMMANDS[lineIndex].output }]);
        setLineIndex((prev) => prev + 1);
        setCharIndex(0);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, lineIndex]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [charIndex, history]);

  const currentCmdText = lineIndex < COMMANDS.length ? COMMANDS[lineIndex].text.substring(0, charIndex) : "";

  return (
    <Card className="w-full max-w-4xl mx-auto bg-[#1e1e1e] border-zinc-800 shadow-2xl overflow-hidden font-mono text-sm">
      {/* Terminal Header */}
      <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-zinc-700">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 text-center text-zinc-400 text-xs">
          root@webrana-cloud: ~
        </div>
      </div>

      {/* Terminal Content */}
      <div ref={scrollRef} className="p-4 h-[450px] overflow-y-auto text-zinc-300 space-y-2 scrollbar-hide">
        {history.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex gap-2">
              <span className="text-emerald-400">root@webrana-cloud:~#</span>
              <span>{item.cmd}</span>
            </div>
            {item.out && (
              <div className="text-zinc-500 whitespace-pre-wrap pl-4 border-l-2 border-zinc-700 ml-1">
                {item.out}
              </div>
            )}
          </div>
        ))}

        {/* Current Line */}
        {lineIndex < COMMANDS.length && (
          <div className="flex gap-2">
            <span className="text-emerald-400">root@webrana-cloud:~#</span>
            <span>
              {currentCmdText}
              <span className="inline-block w-2 h-4 bg-zinc-500 animate-pulse ml-1 align-middle" />
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
