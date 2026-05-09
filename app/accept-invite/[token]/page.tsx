import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AcceptInviteForm } from "./accept-invite-form";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } }
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#16231f] px-5">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-soft">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-md bg-[#183d29] font-black text-white text-lg">R</div>
        <h1 className="text-2xl font-bold">Join {invite.organization.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You were invited to join as <strong>{invite.role.replace("_", " ").toLowerCase()}</strong>.
        </p>
        <AcceptInviteForm token={token} email={invite.email} />
      </section>
    </main>
  );
}
