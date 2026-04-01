"use client";

import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2.5 py-1 rounded-md text-xs font-medium transition-all bg-[#2a2d32] hover:bg-[#3a3d42] text-[#8b9199] hover:text-white"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CommandBlock({ command, multiline }: { command: string; multiline?: boolean }) {
  return (
    <div className="relative bg-black rounded-xl border border-[#2a2d32] p-4 font-mono text-sm">
      <CopyButton text={command} />
      {multiline ? (
        <div className="text-[#e2e4e6] space-y-1 pr-16">
          {command.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      ) : (
        <span className="text-[#e2e4e6] pr-16">{command}</span>
      )}
    </div>
  );
}

function ActionButton({ href, icon, label, sub, color }: { href: string; icon: React.ReactNode; label: string; sub: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-5 rounded-xl border border-[#2a2d32] bg-[#111214] hover:border-[#3a3d42] hover:bg-[#161819] transition-all group"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-white group-hover:text-[#1d9bf0] transition-colors">{label}</p>
        <p className="text-xs text-[#5c6370] mt-0.5">{sub}</p>
      </div>
      <svg className="w-4 h-4 text-[#3a3d42] ml-auto group-hover:text-[#5c6370] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </a>
  );
}

const steps = [
  {
    title: "Welcome",
    subtitle: "Let's get you set up",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-[#c9cdd3] leading-relaxed">
          You&apos;re about to set up the <span className="text-white font-semibold">Shown Media Dashboard</span> dev environment. Takes about 5 minutes.
        </p>
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-6">
          <p className="text-sm text-[#8b9199] mb-4">When you&apos;re done, you&apos;ll have:</p>
          <div className="space-y-3">
            {["An AI assistant (Claude Bot) that writes code for you", "One-click deploys to the live site", "Automatic collaboration — changes sync between teammates"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#1d9bf0]/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-[#1d9bf0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm text-white">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-[#5c6370]">Press <span className="text-white font-medium">Next</span> to start.</p>
      </div>
    ),
  },
  {
    title: "Sign in to GitHub",
    subtitle: "Step 1 of 5",
    content: (
      <div className="space-y-6">
        <p className="text-[#c9cdd3] leading-relaxed">
          GitHub is where the code lives. You need an account to contribute.
        </p>
        <ActionButton
          href="https://github.com/login"
          icon={<svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>}
          label="Sign in to GitHub"
          sub="Create an account or sign in to your existing one"
          color="#ffffff"
        />
        <ActionButton
          href="https://github.com/AlejandroShown/social-watch"
          icon={<svg className="w-6 h-6 text-[#1d9bf0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
          label="Open the project repo"
          sub="Ask Alejandro if you don't have access yet"
          color="#1d9bf0"
        />
        <div className="bg-[#f0a020]/5 rounded-xl border border-[#f0a020]/20 p-4">
          <p className="text-sm text-[#f0a020]">
            Make sure you can see the repo before moving on. If it says &quot;404&quot;, ask Alejandro to add you as a collaborator.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Open Terminal",
    subtitle: "Step 2 of 5",
    content: (
      <div className="space-y-6">
        <p className="text-[#c9cdd3] leading-relaxed">
          Terminal is where you&apos;ll paste commands. Pick your computer:
        </p>
        <div className="space-y-4">
          <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#333] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              </div>
              <h3 className="font-bold text-white">Mac</h3>
            </div>
            <p className="text-sm text-[#8b9199] mb-3">
              Press <kbd className="bg-black px-2 py-0.5 rounded text-xs text-white border border-[#2a2d32] font-mono">Cmd</kbd> + <kbd className="bg-black px-2 py-0.5 rounded text-xs text-white border border-[#2a2d32] font-mono">Space</kbd> → type <span className="text-white font-medium">Terminal</span> → press Enter
            </p>
            <p className="text-xs text-[#5c6370]">Or find Terminal in Applications → Utilities</p>
          </div>
          <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0078d4] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>
              </div>
              <h3 className="font-bold text-white">Windows</h3>
            </div>
            <p className="text-sm text-[#8b9199] mb-3">
              Press <kbd className="bg-black px-2 py-0.5 rounded text-xs text-white border border-[#2a2d32] font-mono">Win</kbd> key → type <span className="text-white font-medium">PowerShell</span> → press Enter
            </p>
            <p className="text-xs text-[#5c6370]">Or right-click Start button → Windows Terminal</p>
          </div>
        </div>
        <div className="bg-[#1d9bf0]/5 rounded-xl border border-[#1d9bf0]/20 p-4">
          <p className="text-sm text-[#1d9bf0]">
            Keep Terminal open — you&apos;ll paste commands into it for the next steps.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Install & Clone",
    subtitle: "Step 3 of 5",
    content: (
      <div className="space-y-6">
        <p className="text-[#c9cdd3] leading-relaxed">
          Paste these commands into Terminal one at a time. Each one takes a few seconds.
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider mb-2">1. Install Node.js (skip if already installed)</p>
            <ActionButton
              href="https://nodejs.org"
              icon={<svg className="w-6 h-6 text-[#00ba7c]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
              label="Download Node.js (LTS)"
              sub="Pick the LTS version, install, then continue"
              color="#00ba7c"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider mb-2">2. Install Claude Code</p>
            <CommandBlock command="npm install -g @anthropic-ai/claude-code" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider mb-2">3. Clone the project</p>
            <CommandBlock command={"git clone https://github.com/AlejandroShown/social-watch.git\ncd social-watch"} multiline />
            <p className="text-xs text-[#5c6370] mt-1.5">If it says &quot;already exists&quot;, just run: <code className="text-[#8b9199]">cd social-watch && git pull</code></p>
          </div>
        </div>
        <div className="bg-[#0d1117] rounded-xl border border-[#1a1c20] p-4">
          <p className="text-sm text-[#8b9199]">
            <span className="text-[#00ba7c] font-medium">Quick check:</span> Run <code className="bg-black px-1.5 py-0.5 rounded text-xs text-white">claude --version</code> — if you see a version number, everything is installed correctly.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Launch Claude Bot",
    subtitle: "Step 4 of 5",
    content: (
      <div className="space-y-6">
        <p className="text-[#c9cdd3] leading-relaxed">
          Make sure you&apos;re in the project folder, then start Claude:
        </p>
        <CommandBlock command="claude" />
        <p className="text-[#8b9199] text-sm">
          Once Claude Code opens, type this command:
        </p>
        <CommandBlock command="/dev-bot" />
        <div className="bg-[#1d9bf0]/5 rounded-xl border border-[#1d9bf0]/20 p-5 space-y-3">
          <p className="text-sm text-white font-semibold">What happens next:</p>
          <div className="space-y-2 text-sm text-[#8b9199]">
            <p>1. Dev Bot detects it&apos;s your first time</p>
            <p>2. It installs everything automatically</p>
            <p>3. It asks you for a few passwords (Alejandro has them)</p>
            <p>4. You get the main menu — you&apos;re in!</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Vercel Access",
    subtitle: "Step 5 of 5",
    content: (
      <div className="space-y-6">
        <p className="text-[#c9cdd3] leading-relaxed">
          Vercel is where the live site runs. You need access to deploy.
        </p>
        <ActionButton
          href="https://vercel.com/alejandroshowns-projects"
          icon={<svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L24 22H0L12 1z"/></svg>}
          label="Open Vercel Dashboard"
          sub="Ask Alejandro to invite you to the team"
          color="#ffffff"
        />
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-6 space-y-3">
          <p className="text-sm font-semibold text-white">Once you have access:</p>
          <p className="text-sm text-[#8b9199]">Dev Bot handles deploys automatically. Just tell it:</p>
          <CommandBlock command="/deploy" />
          <p className="text-xs text-[#5c6370]">It will build, push to GitHub, deploy to Vercel, and verify everything works.</p>
        </div>
      </div>
    ),
  },
  {
    title: "You're all set!",
    subtitle: "Setup complete",
    content: (
      <div className="space-y-6">
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-full bg-[#00ba7c]/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#00ba7c]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
        <p className="text-lg text-[#c9cdd3] leading-relaxed text-center">
          From now on, just open Terminal and type:
        </p>
        <CommandBlock command={"cd social-watch\nclaude"} multiline />
        <p className="text-sm text-[#8b9199] text-center">Then type <code className="bg-[#1a1c20] text-[#1d9bf0] px-2 py-0.5 rounded text-xs">/dev-bot</code> and tell it what you want.</p>
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-6 space-y-4">
          <p className="text-sm font-semibold text-white">Things you can say to Dev Bot:</p>
          <div className="space-y-2.5">
            {[
              ['"fix the login page"', "It reads the code and fixes it"],
              ['"add a new chart"', "It builds and wires it up"],
              ['"deploy"', "Pushes to live with safety checks"],
              ['"what changed?"', "Shows teammate's recent work"],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex items-center gap-3">
                <code className="bg-[#1d9bf0]/10 text-[#1d9bf0] px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap">{cmd}</code>
                <span className="text-xs text-[#5c6370]">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default function TutorialPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-[#2a2d32]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Shown Media" className="h-7 w-7" />
            <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'var(--font-brand), sans-serif' }}>Shown Media Setup</span>
          </div>
          <span className="text-xs text-[#5c6370]">{currentStep + 1} / {steps.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[#111214]">
        <div
          className="h-1 bg-[#1d9bf0] transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-2xl mx-auto px-6 py-10 w-full flex-1">
          <p className="text-xs font-semibold text-[#1d9bf0] uppercase tracking-wider mb-2">{step.subtitle}</p>
          <h2 className="text-2xl font-bold mb-8">{step.title}</h2>
          {step.content}
        </div>

        {/* Navigation */}
        <div className="border-t border-[#2a2d32] bg-[#0a0a0b]">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={isFirst}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isFirst
                  ? "text-[#2a2d32] cursor-not-allowed"
                  : "text-[#8b9199] hover:text-white hover:bg-[#111214]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>

            {isLast ? (
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white transition-colors"
              >
                Go to Dashboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </a>
            ) : (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-black hover:bg-[#e2e4e6] transition-colors"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
