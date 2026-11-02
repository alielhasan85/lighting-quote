import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCaller, getLandingMembership } from "@/lib/auth/caller";
import { landingPath } from "@/lib/workspace/landing";

// The session is runtime data, so it's read inside Suspense. This page only ever redirects.
export default function RootPage() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}

async function Landing(): Promise<never> {
  const caller = await getCaller();
  const membership = caller?.isActive ? await getLandingMembership(caller.userId) : null;
  redirect(landingPath(caller, membership));
}
