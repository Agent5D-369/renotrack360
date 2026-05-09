"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

function BrandBar({ data, docLabel }: { data: { orgName?: string; orgLogoUrl?: string | null; orgBrandColor?: string | null; orgTagline?: string | null }; docLabel: string }) {
  const bg = data.orgBrandColor ?? "#183d29";
  return (
    <header style={{ backgroundColor: bg }} className="w-full">
      <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
        {data.orgLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.orgLogoUrl} alt={data.orgName ?? "Logo"} className="h-9 max-w-[160px] object-contain" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/20 text-sm font-black text-white">
              {(data.orgName ?? "RT").slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-bold text-white">{data.orgName}</p>
          </div>
        )}
        {data.orgLogoUrl && data.orgName && (
          <div className="border-l border-white/20 pl-4">
            <p className="text-sm font-bold text-white">{data.orgName}</p>
            {data.orgTagline && <p className="text-xs text-white/60">{data.orgTagline}</p>}
          </div>
        )}
        <div className="ml-auto">
          <p className="text-xs font-black uppercase tracking-wider text-white/60">{docLabel}</p>
        </div>
      </div>
    </header>
  );
}

interface ReviewData {
  id: string;
  requestType: string;
  jobName?: string;
  clientName?: string;
  orgName?: string;
  orgLogoUrl?: string | null;
  orgBrandColor?: string | null;
  orgTagline?: string | null;
  reviewLink?: string;
  alreadyReceived: boolean;
  rating?: number;
  testimonial?: string;
}

export default function ReviewPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [testimonial, setTestimonial] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/review/${token}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Could not load this review request."); setLoading(false); });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Please select a star rating."); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/review/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, testimonial }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-bold text-red-800">Unable to load this request</p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (done || data.alreadyReceived) {
    return (
      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <BrandBar data={data} docLabel="Review Request" />
        <div className="mx-auto max-w-md space-y-5 px-4 py-12 text-center">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
            <p className="text-4xl">⭐</p>
            <p className="mt-3 text-xl font-black">Thank you!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.alreadyReceived
                ? "Your feedback has already been recorded."
                : "Your feedback has been saved. Your contractor will see it."}
            </p>
          </div>
          {data.reviewLink && (
            <div className="rounded-xl border border-border bg-white p-5">
              <p className="font-bold">One more thing</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Would you mind posting a quick Google review? It takes 60 seconds and helps {data.orgName ?? "your contractor"} enormously.
              </p>
              <a
                href={data.reviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded-xl bg-[#183d29] py-3 text-center text-sm font-black text-white hover:bg-[#1e4d35]"
              >
                Post a Google review →
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <BrandBar data={data} docLabel="Review Request" />
      <div className="mx-auto max-w-lg space-y-5 px-4 py-12">

        <div>
          <h1 className="text-2xl font-black text-[#0f172a]">How did we do?</h1>
          {data.jobName && (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.clientName ? `Hi ${data.clientName.split(" ")[0]}, we'd ` : "We'd "}love your feedback on {data.jobName}.
            </p>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Star rating */}
          <div className="rounded-xl border border-border bg-white p-5">
            <p className="mb-3 font-bold">Overall rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="text-3xl transition-transform hover:scale-110 focus:outline-none"
                >
                  {star <= (hoveredRating || rating) ? "⭐" : "☆"}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
              </p>
            )}
          </div>

          {/* Testimonial */}
          <div className="rounded-xl border border-border bg-white p-5">
            <label className="mb-2 block font-bold">
              Tell us about your experience <span className="text-sm font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              placeholder="What did you appreciate most? Would you recommend this contractor to a friend?"
              rows={4}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#183d29]"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Your testimonial may be shared publicly with your permission.
            </p>
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !rating}
            className="h-13 w-full rounded-xl bg-[#183d29] py-3.5 text-sm font-black text-white transition hover:bg-[#1e4d35] disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Submit feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
