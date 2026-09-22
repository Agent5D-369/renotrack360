import { NextResponse } from "next/server";
export function GET() {
  return new NextResponse("# RenoTrack360\n\nRenoTrack360 is a renovation operations platform, with Flipside Renovations as its first rollout. This workspace is private and project records require authorized access. Public software enrollment is not open.\n", { headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex, nofollow" } });
}
