const BASE_URL = "https://public.api.foreplay.co";

function getApiKey(): string {
  const key = process.env.FOREPLAY_API_KEY;
  if (!key) throw new Error("FOREPLAY_API_KEY is not set");
  return key;
}

async function foreplayFetch<T>(
  path: string,
  params?: Record<string, string | string[] | number | boolean | undefined>
): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: getApiKey() },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Foreplay API ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Types ───

export interface ForeplayBrand {
  id: string;
  name: string;
  category?: string | null;
  url?: string | null;
  avatar?: string;
  ad_library_id?: string;
  websites?: string[];
  niches?: string[];
  [key: string]: unknown;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  sentence: string;
}

export interface ForeplayAd {
  id: string;
  ad_id?: string;
  name?: string;
  brand_id?: string;
  headline?: string;
  description?: string;
  display_format?: string;
  publisher_platform?: string[];
  thumbnail?: string;
  video?: string | null;
  image?: string | null;
  avatar?: string;
  full_transcription?: string;
  timestamped_transcription?: TranscriptSegment[];
  link_url?: string;
  cta_type?: string;
  cta_title?: string;
  live?: boolean;
  started_running?: number;
  running_duration?: { seconds: number; minutes: number; hours: number; days: number };
  video_duration?: number;
  type?: string;
  categories?: string[];
  niches?: string[];
  market_target?: string;
  creative_targeting?: string;
  product_category?: string;
  languages?: string[];
  emotional_drivers?: Record<string, number>;
  persona?: { age?: string; gender?: string };
  [key: string]: unknown;
}

export interface ForeplayResponse<T> {
  data: T;
  metadata: {
    cursor?: number | null;
    count?: number;
    order?: string;
    filters?: Record<string, unknown>;
  };
}

// ─── API Functions ───

export async function getSpyderBrands(
  offset = 0,
  limit = 10
): Promise<ForeplayResponse<ForeplayBrand[]>> {
  return foreplayFetch("/api/spyder/brands", { offset, limit });
}

export async function getSpyderBrandAds(
  brandId: string,
  opts: {
    cursor?: number;
    limit?: number;
    order?: string;
    display_format?: string[];
    live?: boolean;
  } = {}
): Promise<ForeplayResponse<ForeplayAd[]>> {
  return foreplayFetch("/api/spyder/brand/ads", {
    brand_id: brandId,
    cursor: opts.cursor,
    limit: opts.limit ?? 20,
    order: opts.order ?? "newest",
    display_format: opts.display_format,
    live: opts.live,
  });
}

export async function getAd(
  adId: string
): Promise<ForeplayResponse<ForeplayAd>> {
  return foreplayFetch(`/api/ad/${adId}`);
}

export async function getAllBoards(): Promise<ForeplayBrand[]> {
  const all: ForeplayBrand[] = [];
  const PAGE_SIZE = 50;
  let offset = 0;

  while (true) {
    const res = await getSpyderBrands(offset, PAGE_SIZE);
    all.push(...res.data);
    if (res.data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}
