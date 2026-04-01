import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, redirectTo } = await request.json();

  if (!email || !isAllowedEmail(email)) {
    return NextResponse.json(
      { error: "Sorry, your email isn't authorized right now. Check back soon for updates." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const origin = new URL(request.url).origin;
  const next = redirectTo || "/dashboard";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error("Supabase OTP error:", error.message, error.status);
    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Failed to send sign-in link. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
