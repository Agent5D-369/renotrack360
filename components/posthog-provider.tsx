"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

function PostHogIdentify() {
  const ph = usePostHog();
  const { data: session } = useSession();
  useEffect(() => {
    if (session?.user?.email) {
      ph.identify(session.user.email, {
        email: session.user.email,
        name: session.user.name
      });
    }
  }, [session, ph]);
  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  useEffect(() => {
    if (key) {
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: "localStorage"
      });
    }
  }, [key, host]);

  if (!key) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
