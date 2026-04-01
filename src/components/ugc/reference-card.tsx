"use client";

import type { ForeplayAd } from "@/lib/foreplay";

const FORMAT_LABELS: Record<string, string> = {
  VIDEO: "Video",
  IMAGE: "Image",
  CAROUSEL: "Carousel",
  DCO: "DCO",
  video: "Video",
  image: "Image",
  carousel: "Carousel",
};

const PLATFORM_SHORT: Record<string, string> = {
  facebook: "FB",
  instagram: "IG",
  messenger: "MSG",
  audience_network: "AN",
  threads: "TH",
};

export function ReferenceCard({
  ad,
  isSelected,
  onClick,
}: {
  ad: ForeplayAd;
  isSelected: boolean;
  onClick: () => void;
}) {
  const thumbnailSrc = ad.thumbnail || ad.image;
  const format = ad.display_format
    ? FORMAT_LABELS[ad.display_format] ?? ad.display_format
    : null;
  const platforms = ad.publisher_platform
    ?.map((p) => PLATFORM_SHORT[p] ?? p)
    .join(" ");
  const runDays = ad.running_duration?.days;
  const hasTranscript = !!(
    ad.full_transcription || ad.timestamped_transcription?.length
  );

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={`bg-[#111214] rounded-xl overflow-hidden cursor-pointer transition-all border ${
        isSelected
          ? "border-[#1d9bf0]"
          : "border-[#1a1c20] hover:border-[#2a2d32]"
      }`}
    >
      {/* Thumbnail */}
      {thumbnailSrc ? (
        <div className="w-full h-40 bg-[#0c0d0f] relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailSrc}
            alt={ad.headline ?? "Ad thumbnail"}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 flex gap-1">
            {platforms && (
              <span className="bg-black/70 text-white px-2 py-0.5 rounded text-[11px] font-semibold">
                {platforms}
              </span>
            )}
            {format && (
              <span className="bg-black/70 text-[#9ca3af] px-2 py-0.5 rounded text-[11px] font-medium">
                {format}
              </span>
            )}
          </div>
          {ad.live && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_theme(colors.green.500)]" />
          )}
        </div>
      ) : (
        <div className="w-full h-20 bg-[#0c0d0f] flex items-center justify-center text-[#2a2d32] text-xs">
          No preview
        </div>
      )}

      {/* Body */}
      <div className="p-3">
        {ad.headline && (
          <p className="text-[13px] font-semibold text-[#e0e0e0] leading-tight line-clamp-2">
            {ad.headline}
          </p>
        )}
        {ad.description && (
          <p className="mt-1 text-xs text-[#6b7280] leading-tight line-clamp-2">
            {ad.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {runDays != null && runDays > 0 && (
            <span className="text-[11px] text-[#4a4d52]">
              {runDays}d running
            </span>
          )}
          {ad.product_category && (
            <span className="text-[10px] text-[#6b7280] bg-white/5 px-1.5 py-0.5 rounded">
              {ad.product_category}
            </span>
          )}
          {hasTranscript && (
            <span className="text-[10px] font-semibold text-[#1d9bf0] bg-[#1d9bf0]/15 px-1.5 py-0.5 rounded">
              TRANSCRIPT
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
