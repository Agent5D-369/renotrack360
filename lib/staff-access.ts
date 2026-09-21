import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { findStaff } from "./staff-record";
import { redirect } from "next/navigation";
import { cache } from "react";

export class StaffAccessError extends Error {
  constructor() { super("An active Flipside owner or administrator membership is required."); }
}

export const currentStaff = cache(async () => {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? findStaff({ id: session.user.id }) : null;
});

export async function requireStaff() {
  const staff = await currentStaff();
  if (!staff) throw new StaffAccessError();
  return staff;
}

export async function requireStaffPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/login?error=AccessDenied");
  return staff;
}

export async function staffApiDenial(): Promise<Response | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!await findStaff({ id: session.user.id })) return Response.json({ error: "Staff access denied" }, { status: 403 });
  return null;
}
