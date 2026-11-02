import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import { getCaller } from "@/lib/auth/caller";
import { LoginClient } from "./login-client";

// The session and the URL are runtime data, so they're read inside Suspense. The layout stays in the static shell.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { callbackUrl, error } = await searchParams;
  const target = safeCallbackUrl(callbackUrl);

  if (await getCaller()) redirect(target);

  return <LoginClient callbackUrl={target} error={typeof error === "string" ? error : undefined} />;
}
