import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedEmail, isAdminEmail } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/tutorial", "/auth/callback", "/api/auth", "/api/cron", "/share", "/api/share", "/api/slack", "/launch", "/war-room-share", "/war-room", "/api/war-room"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }

  // Campaign report: only individual report pages are public (shareable links)
  // /campaign-report/[slug] is public, but /campaign-report and /campaign-report/create are NOT
  if (pathname.startsWith("/campaign-report/")) {
    const rest = pathname.slice("/campaign-report/".length);
    // Block /campaign-report/create (requires auth)
    if (rest === "create" || rest.startsWith("create/")) return false;
    // Any other slug path is public (the shareable report)
    return true;
  }

  // API: only GET /api/campaign-reports/[slug] is public (the report data endpoint)
  // Block: /upload, /refresh, /creator-posts, and the base route
  if (pathname.startsWith("/api/campaign-reports/")) {
    const rest = pathname.slice("/api/campaign-reports/".length);
    // Block known auth-required routes
    if (rest === "upload" || rest.startsWith("upload/")) return false;
    // Allow only clean slug paths (no sub-paths like /refresh or /creator-posts)
    if (rest && !rest.includes("/")) return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email || "")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  const isAdminRoute =
    pathname.startsWith("/capacity-tracker") ||
    pathname.startsWith("/api/capacity");

  if (isAdminRoute && !isAdminEmail(user.email || "")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg|logo.svg).*)"],
};
