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

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field label="Email" name="email" error={form.formState.errors.email?.message}>
        <input className="h-10 rounded-md border border-border px-3 text-sm" {...form.register("email")} />
      </Field>
      <Field label="Password" name="password" error={form.formState.errors.password?.message}>
        <input className="h-10 rounded-md border border-border px-3 text-sm" type="password" {...form.register("password")} />
      </Field>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button>Sign in</Button>
      <p className="text-xs text-muted-foreground">
        Seeded admin defaults come from ADMIN_EMAIL and ADMIN_PASSWORD in your environment.
      </p>
    </form>
  );
}
