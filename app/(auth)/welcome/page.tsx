import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireSignedInPage } from "@/lib/auth/authz";
import { getLandingMembership } from "@/lib/auth/caller";
import { WELCOME_PATH } from "@/lib/workspace/landing";
import { WelcomeClient } from "./welcome-client";

export const metadata: Metadata = { title: "Create your workspace" };

// In (auth) for its centered layout: there is no workspace to guard on yet.
export default function WelcomePage() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const { userId } = await requireSignedInPage(WELCOME_PATH);
  if (await getLandingMembership(userId)) redirect("/");
  return <WelcomeClient />;
}
