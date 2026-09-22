import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { authOptions } from "@/lib/auth";
import Image from "next/image";
import { FLIPSIDE_LOGO, FLIPSIDE_NAME } from "@/lib/flipside-brand";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/home");

  const demoEmail = process.env.DEMO_USER_EMAIL ?? "demo@renotrack360.com";
  const demoPassword = process.env.DEMO_USER_PASSWORD ?? "LiveDemo2025";
  const showDemo = false;

  return (
    <main className="grid min-h-screen place-items-center bg-[#171717] px-5 py-8">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-soft">
        <div className="mb-8">
          <Image src={FLIPSIDE_LOGO} alt={FLIPSIDE_NAME} width={805} height={639} priority className="mb-5 h-auto w-40" />
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Flipside Command Center</p>
          <h1 className="mt-1 text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Austin renovation operations, from first conversation to final walkthrough.</p>
        </div>

        <LoginForm googleEnabled={!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />

        {showDemo && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-green-700">Demo access</p>
            <p className="mt-2 text-sm text-muted-foreground">Try the full platform with sample renovation data.</p>
            <div className="mt-3 grid gap-1 rounded-md bg-white p-3 font-mono text-sm">
              <p><span className="text-muted-foreground">Email:</span> <strong>{demoEmail}</strong></p>
              <p><span className="text-muted-foreground">Password:</span> <strong>{demoPassword}</strong></p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
