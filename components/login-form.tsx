"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Field } from "@/components/ui";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export function LoginForm({ googleEnabled }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setError("");
    const result = await signIn("credentials", { ...values, redirect: false });
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/home" });
  }

  return (
    <div className="grid gap-4">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="flex h-10 w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-4 text-sm font-semibold shadow-sm hover:bg-muted disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>
          <div className="flex items-center gap-3">
            <hr className="flex-1 border-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <hr className="flex-1 border-border" />
          </div>
        </>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <Field label="Email" name="email" error={form.formState.errors.email?.message}>
          <input id="email" autoComplete="username" className="h-10 rounded-md border border-border px-3 text-sm" {...form.register("email")} />
        </Field>
        <Field label="Password" name="password" error={form.formState.errors.password?.message}>
          <input id="password" autoComplete="current-password" className="h-10 rounded-md border border-border px-3 text-sm" type="password" {...form.register("password")} />
        </Field>
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        <Button>Sign in</Button>
        <div className="flex justify-end">
          <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            Forgot password?
          </a>
        </div>
      </form>
    </div>
  );
}
