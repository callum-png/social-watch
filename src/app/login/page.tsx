"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const from = searchParams.get("from") || "/post-login";

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: from }),
      });

      if (!res.ok) {
        const data = await res.json();
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong. Try again.");
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg("Could not connect. Try again.");
    }
  };

  if (status === "sent") {
    return (
      <div className="bg-[#111214] rounded-2xl border border-[#2a2d32] p-6 md:p-10 w-full max-w-sm shadow-2xl shadow-black/50 text-center mx-4 md:mx-0">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#1d9bf0]/15 flex items-center justify-center">
            <svg className="w-7 h-7 text-[#1d9bf0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
        <p className="text-sm text-[#8b9199] mb-6">
          We sent a sign-in link to<br />
          <span className="text-white font-medium">{email}</span>
        </p>
        <p className="text-xs text-[#5c6370]">Click the link in your email to sign in.</p>
        <button
          onClick={() => { setStatus("idle"); setErrorMsg(""); }}
          className="mt-6 text-xs text-[#1d9bf0] hover:text-white transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#111214] rounded-2xl border border-[#2a2d32] p-6 md:p-10 w-full max-w-sm shadow-2xl shadow-black/50 mx-4 md:mx-0">
      <div className="flex flex-col items-center mb-8 gap-2">
        <img src="/favicon.svg" alt="Shown Media" className="h-12 w-12" />
        <span className="text-base font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-brand), sans-serif' }}>Shown Media</span>
      </div>
      <h1 className="text-xl font-bold text-white text-center mb-1">Sign in</h1>
      <p className="text-[#8b9199] text-sm text-center mb-8">Enter your email to get a sign-in link</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@shownmedia.com"
          className="w-full px-4 py-3.5 bg-black/50 border border-[#2a2d32] rounded-xl text-sm text-white placeholder-[#5c6370] focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]/50 focus:border-[#1d9bf0]/50 mb-4"
          autoFocus
        />
        {errorMsg && (
          <p className="text-sm text-[#8b9199] mb-3">{errorMsg}</p>
        )}
        <button
          type="submit"
          disabled={status === "loading" || !email}
          className="w-full bg-white text-black py-3.5 rounded-full text-sm font-bold hover:bg-[#e2e4e6] disabled:opacity-50 transition-colors"
        >
          {status === "loading" ? "Sending..." : "Send sign-in link"}
        </button>
      </form>
      <div className="mt-8 flex justify-center">
        <span className="text-xs font-semibold text-[#5c6370] tracking-wide" style={{ fontFamily: 'var(--font-brand), sans-serif' }}>SHOWN MEDIA</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <Suspense
        fallback={
          <div className="bg-[#111214] rounded-2xl border border-[#2a2d32] p-6 md:p-10 w-full max-w-sm shadow-2xl shadow-black/50 mx-4 md:mx-0">
            <div className="flex flex-col items-center mb-8 gap-2">
              <img src="/favicon.svg" alt="Shown Media" className="h-12 w-12" />
              <span className="text-base font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-brand), sans-serif' }}>Shown Media</span>
            </div>
            <h1 className="text-xl font-bold text-white text-center mb-1">Sign in</h1>
            <p className="text-[#8b9199] text-sm text-center mb-8">Loading...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
