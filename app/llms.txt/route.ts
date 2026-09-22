import { NextResponse } from "next/server";
export function GET() {
  return new NextResponse("# Flipside Renovations\n\nThis host is the private Flipside Renovations project command center. Standalone RenoTrack360 software sales are paused. Project records require authorized access.\n", { headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex, nofollow" } });
}
