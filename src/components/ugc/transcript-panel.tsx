"use client";

import type { ForeplayAd } from "@/lib/foreplay";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-[#6b7280]">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold text-[#4a4d52] uppercase tracking-wide mb-1.5">
      {children}
    </h4>
  );
}

export function TranscriptPanel({
  ad,
  onClose,
}: {
  ad: ForeplayAd;
  onClose: () => void;
}) {
  const hasTimestamped =
    ad.timestamped_transcription && ad.timestamped_transcription.length > 0;

  return (
    <div className="w-[420px] min-w-[420px] bg-[#0c0d0f] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1c20] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#e0e0e0]">
          Ad Details
        </span>
        <button
          onClick={onClose}
          className="text-[#4a4d52] hover:text-white text-lg leading-none px-1.5 py-0.5 transition-colors"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Video or image */}
        {ad.video ? (
          <video
            src={ad.video}
            controls
            poster={ad.thumbnail || undefined}
            className="w-full rounded-lg bg-[#111214] max-h-[300px]"
          />
        ) : (ad.thumbnail || ad.image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(ad.thumbnail || ad.image)!}
            alt={ad.headline ?? "Ad"}
            className="w-full rounded-lg object-cover max-h-[300px]"
          />
        ) : null}

        <div className="mt-4">
          {ad.headline && (
            <h3 className="text-[15px] font-semibold text-white leading-tight mb-1">
              {ad.headline}
            </h3>
          )}
          {ad.name && (
            <p className="text-xs text-[#6b7280] mb-3">{ad.name}</p>
          )}

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ad.live !== undefined && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  ad.live
                    ? "bg-green-500/15 text-green-500"
                    : "bg-red-500/15 text-red-500"
                }`}
              >
                {ad.live ? "Live" : "Inactive"}
              </span>
            )}
            {ad.display_format && <Pill>{ad.display_format}</Pill>}
            {ad.publisher_platform?.map((p) => <Pill key={p}>{p}</Pill>)}
            {ad.running_duration?.days != null &&
              ad.running_duration.days > 0 && (
                <Pill>{ad.running_duration.days}d running</Pill>
              )}
            {ad.cta_type && <Pill>{ad.cta_type}</Pill>}
            {ad.product_category && <Pill>{ad.product_category}</Pill>}
          </div>

          {/* Categories / niches */}
          {(ad.categories?.length || ad.niches?.length) ? (
            <div className="flex flex-wrap gap-1 mb-3">
              {ad.categories?.map((c) => (
                <span
                  key={c}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#1d9bf0]/15 text-[#1d9bf0]"
                >
                  {c}
                </span>
              ))}
              {ad.niches?.map((n) => (
                <span
                  key={n}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#1d9bf0]/10 text-[#1d9bf0]"
                >
                  {n}
                </span>
              ))}
            </div>
          ) : null}

          {/* Ad copy */}
          {ad.description && (
            <div className="mb-4">
              <SectionLabel>Ad Copy</SectionLabel>
              <p className="text-[13px] text-[#ccc] leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-auto">
                {ad.description}
              </p>
            </div>
          )}

          {/* Transcript */}
          <div>
            <SectionLabel>Transcript</SectionLabel>
            {hasTimestamped ? (
              <div className="bg-[#111214] p-3 rounded-lg border border-[#1a1c20] max-h-[400px] overflow-auto">
                {ad.timestamped_transcription!.map((seg, i) => (
                  <div key={i} className="flex gap-2.5 mb-1.5 text-[13px] leading-relaxed">
                    <span className="text-[#4a4d52] tabular-nums min-w-[36px] shrink-0 text-[11px] pt-0.5">
                      {formatTime(seg.startTime)}
                    </span>
                    <span className="text-[#ccc]">{seg.sentence.trim()}</span>
                  </div>
                ))}
              </div>
            ) : ad.full_transcription ? (
              <p className="text-[13px] text-[#ccc] leading-relaxed whitespace-pre-wrap bg-[#111214] p-3 rounded-lg border border-[#1a1c20]">
                {ad.full_transcription}
              </p>
            ) : (
              <p className="text-[13px] text-[#3a3d42] italic">
                No transcript available for this ad.
              </p>
            )}
          </div>

          {/* Landing page */}
          {ad.link_url && (
            <div className="mt-4">
              <a
                href={ad.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1d9bf0] hover:underline"
              >
                View landing page &rarr;
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
