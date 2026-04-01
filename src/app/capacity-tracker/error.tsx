"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="bg-[#111214] border border-[#2a2d32] rounded-2xl p-8 max-w-lg w-full">
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <pre className="text-sm text-red-400 bg-black/50 rounded-lg p-4 overflow-auto max-h-48 mb-4 whitespace-pre-wrap">
          {error.message}
        </pre>
        {error.digest && (
          <p className="text-xs text-[#5c6370] mb-4">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#1d9bf0] text-white rounded-lg text-sm font-medium hover:bg-[#1a8cd8] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
