"use client";

import { useState, useEffect, useCallback } from "react";
import { ReferenceCard } from "@/components/ugc/reference-card";
import { TranscriptPanel } from "@/components/ugc/transcript-panel";
import type { ForeplayAd } from "@/lib/foreplay";

interface Brand {
  id: string;
  name: string;
  avatar?: string;
}

export default function ReferencesPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [ads, setAds] = useState<ForeplayAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<ForeplayAd | null>(null);
  const [loading, setLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Load brands on mount
  useEffect(() => {
    async function loadBrands() {
      setBrandsLoading(true);
      try {
        const allBrands: Brand[] = [];
        let offset = 0;
        let keepGoing = true;
        while (keepGoing) {
          const res = await fetch(`/api/foreplay/brands?offset=${offset}&limit=10`);
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            allBrands.push(...json.data);
            offset += 10;
            if (json.data.length < 10) keepGoing = false;
          } else {
            keepGoing = false;
          }
        }
        setBrands(allBrands);
        if (allBrands.length > 0) {
          setSelectedBrandId(allBrands[0].id);
        }
      } catch (err) {
        console.error("Failed to load brands:", err);
      } finally {
        setBrandsLoading(false);
      }
    }
    loadBrands();
  }, []);

  const loadAds = useCallback(
    async (brandId: string, nextCursor?: number) => {
      if (!brandId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ brand_id: brandId, limit: "20" });
        if (nextCursor !== undefined) {
          params.set("cursor", String(nextCursor));
        }
        const res = await fetch(`/api/foreplay/ads?${params}`);
        const json = await res.json();

        if (nextCursor !== undefined) {
          setAds((prev) => [...prev, ...(json.data ?? [])]);
        } else {
          setAds(json.data ?? []);
          setSelectedAd(null);
        }

        setCursor(json.metadata?.cursor ?? null);
        setHasMore(json.metadata?.cursor != null);
      } catch (err) {
        console.error("Failed to load ads:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedBrandId) {
      loadAds(selectedBrandId);
    }
  }, [selectedBrandId, loadAds]);

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left: Brand selector + grid */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          selectedAd ? "border-r border-[#1a1c20]" : ""
        }`}
      >
        {/* Brand selector bar */}
        <div className="px-6 py-3 border-b border-[#1a1c20] flex items-center gap-3 bg-[#0c0d0f]">
          <label
            htmlFor="brand-select"
            className="text-[13px] text-[#6b7280] font-medium"
          >
            Brand
          </label>
          <select
            id="brand-select"
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            disabled={brandsLoading}
            className="bg-[#111214] text-white border border-[#2a2d32] rounded-lg px-3 py-1.5 text-[13px] min-w-[200px] cursor-pointer outline-none focus:border-[#1d9bf0] transition-colors"
          >
            {brandsLoading && <option value="">Loading brands...</option>}
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <span className="text-xs text-[#4a4d52]">
            {ads.length} ad{ads.length !== 1 ? "s" : ""} loaded
          </span>
        </div>

        {/* Ad grid */}
        <div className="flex-1 overflow-auto p-4">
          {loading && ads.length === 0 ? (
            <div className="flex justify-center items-center h-full text-[#4a4d52] text-sm">
              Loading ads...
            </div>
          ) : ads.length === 0 && !loading ? (
            <div className="flex justify-center items-center h-full text-[#4a4d52] text-sm">
              {selectedBrandId
                ? "No ads found for this brand"
                : "Select a brand to view ads"}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                {ads.map((ad) => (
                  <ReferenceCard
                    key={ad.id}
                    ad={ad}
                    isSelected={selectedAd?.id === ad.id}
                    onClick={() =>
                      setSelectedAd(selectedAd?.id === ad.id ? null : ad)
                    }
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center py-5">
                  <button
                    onClick={() => {
                      if (cursor !== null) loadAds(selectedBrandId, cursor);
                    }}
                    disabled={loading}
                    className="bg-[#111214] text-[#6b7280] border border-[#2a2d32] rounded-lg px-5 py-2 text-[13px] hover:text-white hover:border-[#3a3d42] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Transcript panel */}
      {selectedAd && (
        <TranscriptPanel ad={selectedAd} onClose={() => setSelectedAd(null)} />
      )}
    </div>
  );
}
