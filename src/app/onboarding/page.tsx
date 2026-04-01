"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [twitterHandle, setTwitterHandle] = useState("");
  const [accountInput, setAccountInput] = useState("");
  const [watchedAccounts, setWatchedAccounts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addAccount = () => {
    const handle = accountInput.replace(/^@/, "").trim().toLowerCase();
    if (handle && !watchedAccounts.includes(handle)) {
      setWatchedAccounts([...watchedAccounts, handle]);
      setAccountInput("");
    }
  };

  const removeAccount = (handle: string) => {
    setWatchedAccounts(watchedAccounts.filter((a) => a !== handle));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitterHandle,
          watchedAccountHandles: watchedAccounts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      document.cookie = `user_id=${data.id};path=/;max-age=${60 * 60 * 24 * 365}`;
      router.push("/dashboard/launch-videos");
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-900">Social Watch</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  s <= step ? "bg-gray-900" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Twitter Handle */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What&apos;s your Twitter @?
              </h2>
              <p className="text-gray-500 mb-6">
                This is the account you want us to monitor and surface results for.
              </p>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent">
                <span className="pl-3 text-gray-400">@</span>
                <input
                  type="text"
                  value={twitterHandle}
                  onChange={(e) =>
                    setTwitterHandle(
                      e.target.value.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "")
                    )
                  }
                  placeholder="username"
                  className="flex-1 px-2 py-3 outline-none text-gray-900"
                  maxLength={15}
                  autoFocus
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!twitterHandle.trim()}
                className="w-full mt-4 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Accounts to Watch */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Accounts to watch
              </h2>
              <p className="text-gray-500 mb-6">
                Add specific accounts you want us to monitor. We&apos;ll surface
                their posts that match our search criteria.
              </p>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent">
                  <span className="pl-3 text-gray-400">@</span>
                  <input
                    type="text"
                    value={accountInput}
                    onChange={(e) =>
                      setAccountInput(
                        e.target.value.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "")
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addAccount();
                    }}
                    placeholder="username"
                    className="flex-1 px-2 py-3 outline-none text-gray-900"
                    maxLength={15}
                    autoFocus
                  />
                </div>
                <button
                  onClick={addAccount}
                  disabled={!accountInput.trim()}
                  className="px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>

              {watchedAccounts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {watchedAccounts.map((handle) => (
                    <span
                      key={handle}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700"
                    >
                      @{handle}
                      <button
                        onClick={() => removeAccount(handle)}
                        className="text-gray-400 hover:text-gray-600 ml-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={watchedAccounts.length === 0}
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Confirm your setup
              </h2>
              <p className="text-gray-500 mb-6">
                Once you submit, an admin will review and activate your monitoring.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your account
                  </span>
                  <p className="text-gray-900 font-medium">@{twitterHandle}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Watching {watchedAccounts.length} account
                    {watchedAccounts.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {watchedAccounts.map((handle, i) => (
                      <span key={handle} className="text-gray-700 text-sm">
                        @{handle}
                        {i < watchedAccounts.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium"
                >
                  {submitting ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
