import { NextRequest, NextResponse } from "next/server";
import { getSpyderBrandAds, getAd } from "@/lib/foreplay";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const adId = searchParams.get("ad_id");
    if (adId) {
      const result = await getAd(adId);
      return NextResponse.json(result);
    }

    const brandId = searchParams.get("brand_id");
    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const order = searchParams.get("order") ?? "newest";
    const displayFormat = searchParams.getAll("display_format");
    const live = searchParams.get("live");

    const result = await getSpyderBrandAds(brandId, {
      cursor: cursor ? parseInt(cursor, 10) : undefined,
      limit,
      order,
      display_format: displayFormat.length > 0 ? displayFormat : undefined,
      live: live !== null ? live === "true" : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
