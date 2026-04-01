import { createHmac, timingSafeEqual } from "crypto";

const FIVE_MINUTES = 5 * 60;

export function verifySlackRequest(
  signingSecret: string,
  headers: {
    signature: string | null;
    timestamp: string | null;
  },
  rawBody: string
): boolean {
  const { signature, timestamp } = headers;

  if (!signature || !timestamp) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > FIVE_MINUTES) return false;

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature =
    "v0=" +
    createHmac("sha256", signingSecret).update(sigBasestring).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(mySignature, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}
